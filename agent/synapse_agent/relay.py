"""
Supabase Realtime integration -- connects the agent to the Synapse cloud.

Handles:
- Authentication with Supabase via stored JWT
- Subscribing to the user's private Broadcast channel
- Routing incoming events (prompt, cancel, files, read, shell, ping)
- Streaming responses back via Broadcast

NOTE: The realtime library v2.28 calls broadcast callbacks *synchronously*
      from _handle_message, so we must wrap async handlers with
      asyncio.create_task() to schedule them on the event loop.
"""

from __future__ import annotations

import asyncio
import functools
import json
import os
import platform
import re
import time
import uuid
from typing import Any, Callable, Coroutine

from rich.console import Console

from synapse_agent.bridge import ToolBridge, _strip_ansi
from synapse_agent.config import load_config, save_config, get_supabase_config
from synapse_agent.models import ToolResult
from synapse_agent.tools import discover_all_tools, TOOL_MODELS

console = Console()


# ── Output post-processing ──────────────────────────────────
# Copilot CLI (and similar tools) produce extremely verbose output:
#   - Tool-call banners, file trees, thinking indicators
#   - Repeated section headers
#   - Full file contents when only a summary was asked
# This cleaner extracts the meaningful answer.

# Patterns that mark the start of copilot "tool use" noise
_TOOL_BANNER_RE = re.compile(
    r'^\s*(?:'
    r'(?:Running|Calling|Executing|Using)\s+(?:tool|command|action)|'
    r'Tool\s*(?:call|result|output|response)|'
    r'(?:Command|Result|Output)\s*:?\s*$|'
    r'─{3,}|━{3,}|═{3,}|—{3,}|_{5,}'
    r')',
    re.IGNORECASE,
)

# Lines that are purely decorative / noise
_JUNK_LINE_RE = re.compile(
    r'^\s*(?:'
    r'[\u2500-\u257F\u2580-\u259F]{3,}|'          # box-drawing lines
    r'[=\-~]{5,}|'                                 # separator lines
    r'[\s⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●○◐◑◒◓◔◕]+$|'             # spinners
    r'\x1b|'                                        # leftover escapes
    r'Thinking\.{0,3}$|Working\.{0,3}$'
    r')',
    re.IGNORECASE,
)


def _clean_tool_output(raw: str, tool: str = "") -> str:
    """
    Clean CLI tool output for human consumption.

    - Strips ANSI escapes
    - Removes tool-call banners, separator lines, spinners
    - Collapses 3+ consecutive blank lines → 1
    - Trims leading/trailing whitespace
    """
    text = _strip_ansi(raw)

    lines = text.splitlines()
    cleaned: list[str] = []
    blank_count = 0

    for line in lines:
        stripped = line.rstrip()

        # Skip junk
        if _JUNK_LINE_RE.match(stripped):
            blank_count += 1
            continue

        # Skip tool banners
        if _TOOL_BANNER_RE.match(stripped):
            continue

        if not stripped:
            blank_count += 1
            if blank_count <= 2:
                cleaned.append('')
            continue

        blank_count = 0
        cleaned.append(stripped)

    # Trim leading/trailing empty lines
    while cleaned and not cleaned[0].strip():
        cleaned.pop(0)
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()

    return '\n'.join(cleaned)


def _sync_wrapper(async_fn: Callable[..., Coroutine]) -> Callable:
    """
    Wraps an async handler so it can be used as a sync broadcast callback.

    The realtime library calls broadcast callbacks synchronously. This wrapper
    schedules the async handler on the running event loop via create_task().
    """
    @functools.wraps(async_fn)
    def wrapper(payload: dict) -> None:
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(async_fn(payload))
            # Log unhandled exceptions so they don't vanish silently
            task.add_done_callback(_task_done_callback)
        except RuntimeError:
            pass  # No event loop running, skip
    return wrapper


def _task_done_callback(task: asyncio.Task) -> None:
    """Log any unhandled exception from a fire-and-forget task."""
    if task.cancelled():
        return
    exc = task.exception()
    if exc:
        console.print(f"[red]Handler error: {exc}[/red]")


class SynapseRelay:
    """
    Connects to Supabase Realtime and relays prompts to local CLI tools.

    Architecture:
    - Agent subscribes to Broadcast channel "agent:{user_uuid}"
    - Web portal sends events: prompt, cancel, files, read, shell, ping
    - Agent executes locally and streams responses back on the same channel
    """

    def __init__(self):
        self.bridge = ToolBridge()
        self.config = load_config()
        self._channel = None
        self._socket = None
        self._user_id: str = ""
        self._agent_id: str = self.config.get("agent_id", "")
        self._running = False
        self._supabase = None

    def _persist_tokens(self, event: str, session) -> None:
        """Save refreshed tokens to disk so they survive restarts."""
        if session and hasattr(session, "access_token") and session.access_token:
            updated = {
                **self.config,
                "access_token": session.access_token,
                "refresh_token": session.refresh_token or "",
            }
            save_config(updated)
            self.config = updated

    async def connect(self) -> None:
        """Establish connection to Supabase Realtime."""
        from supabase import acreate_client

        url, anon_key = get_supabase_config()
        access_token = self.config.get("access_token", "")
        refresh_token = self.config.get("refresh_token", "")

        if not access_token:
            console.print("[red]Not authenticated. Run 'synapse login' first.[/red]")
            return

        # Create Supabase client with user's JWT
        self._supabase = await acreate_client(url, anon_key)

        # Listen for token refreshes so we always persist the latest tokens
        self._supabase.auth.on_auth_state_change(self._persist_tokens)

        try:
            # set_session auto-refreshes if the access_token is expired
            auth_response = await self._supabase.auth.set_session(
                access_token=access_token,
                refresh_token=refresh_token,
            )
        except Exception as exc:
            console.print(f"[red]Authentication failed: {exc}[/red]")
            console.print("[yellow]Run 'synapse login' to re-authenticate.[/yellow]")
            return

        # Get user ID from session
        session = await self._supabase.auth.get_session()
        if not session or not session.user:
            console.print("[red]Session expired. Run 'synapse login' again.[/red]")
            return

        # Persist the (possibly refreshed) tokens immediately
        self._persist_tokens("SIGNED_IN", session)

        self._user_id = session.user.id
        console.print(f"[green]Authenticated as {session.user.email}[/green]")

        # Register/update agent in database
        await self._register_agent()

        # Subscribe to the user's Broadcast channel
        # NOTE: Using public channel (no private: True) because private channels
        # require RLS policies on realtime.messages which would silently drop
        # messages between clients. The channel name contains the user UUID
        # so it is not guessable.
        channel_name = f"agent:{self._user_id}"
        self._channel = self._supabase.realtime.channel(
            channel_name,
            params={
                "config": {
                    "broadcast": {"ack": False, "self": False},
                    "presence": {"key": "", "enabled": False},
                }
            },
        )

        # Register event handlers (wrapped as sync callbacks)
        self._channel.on_broadcast("prompt", _sync_wrapper(self._handle_prompt))
        self._channel.on_broadcast("cancel", _sync_wrapper(self._handle_cancel))
        self._channel.on_broadcast("files", _sync_wrapper(self._handle_files))
        self._channel.on_broadcast("read", _sync_wrapper(self._handle_read))
        self._channel.on_broadcast("shell", _sync_wrapper(self._handle_shell))
        self._channel.on_broadcast("ping", _sync_wrapper(self._handle_ping))
        self._channel.on_broadcast("set_workdir", _sync_wrapper(self._handle_set_workdir))

        await self._channel.subscribe()
        console.print(f"[green]Listening on channel: {channel_name}[/green]")

    async def _register_agent(self) -> None:
        """Register or update this agent in the database."""
        tools = discover_all_tools()
        tool_names = [t.name for t in tools]

        if tools:
            console.print(f"[cyan]Detected tools: {', '.join(tool_names)}[/cyan]")
        else:
            console.print("[yellow]No AI CLI tools detected. Install one first.[/yellow]")

        agent_data = {
            "user_id": self._user_id,
            "hostname": platform.node(),
            "os": platform.system().lower(),
            "tools": tool_names,
            "is_online": True,
            "last_seen_at": "now()",
            "work_dir": self.bridge.work_dir,
            "name": self.config.get("agent_name", "") or platform.node(),
        }

        if self._agent_id:
            # Update existing agent
            await self._supabase.table("agents").update(agent_data).eq(
                "id", self._agent_id
            ).execute()
        else:
            # Insert new agent
            agent_data["id"] = str(uuid.uuid4())
            result = await self._supabase.table("agents").insert(agent_data).execute()
            if result.data:
                self._agent_id = result.data[0]["id"]
                save_config({**self.config, "agent_id": self._agent_id})

        console.print(f"[green]Agent registered: {agent_data['name']}[/green]")

    # ---- Event Handlers ----

    async def _handle_prompt(self, payload: dict) -> None:
        """Handle incoming prompt from web portal."""
        data = payload.get("payload", {})
        tool = data.get("tool", self.config.get("default_tool", "copilot"))
        prompt = data.get("text", "")
        conversation_id = data.get("conversation_id", "")
        timeout = data.get("timeout", self.config.get("default_timeout", 300))

        model = data.get("model")

        if not prompt:
            return

        model_info = f" [{model}]" if model else ""
        console.print(f"\n[bold cyan]Prompt ({tool}{model_info}):[/bold cyan] {prompt[:100]}...")

        async def on_line(line: str) -> None:
            """Stream each output line back via Broadcast."""
            if self._channel:
                try:
                    await self._channel.send_broadcast(
                        "output",
                        {
                            "conversation_id": conversation_id,
                            "line": line,
                            "timestamp": time.time(),
                        },
                    )
                except Exception as e:
                    console.print(f"[red]Broadcast output error: {e}[/red]")

        result = await self.bridge.run_prompt(
            tool_name=tool,
            prompt=prompt,
            timeout=timeout,
            on_line=on_line,
            model=model,
        )

        # Clean the output — strip CLI noise, spinners, banners
        result.stdout = _clean_tool_output(result.stdout, tool)
        if result.stderr:
            result.stderr = _clean_tool_output(result.stderr, tool)

        # Send final result event
        if self._channel:
            try:
                await self._channel.send_broadcast(
                    "result",
                    {
                        "conversation_id": conversation_id,
                        **result.to_dict(),
                    },
                )
                console.print(f"[green]Result sent to web portal[/green]")
            except Exception as e:
                console.print(f"[red]Broadcast result error: {e}[/red]")

        icon = "OK" if result.success else "WARN"
        console.print(f"[bold]{icon} Done ({result.duration:.1f}s)[/bold]")

    async def _handle_cancel(self, payload: dict) -> None:
        """Handle cancel event."""
        cancelled = await self.bridge.cancel()
        status = "cancelled" if cancelled else "nothing_running"
        console.print(f"[yellow]Cancel: {status}[/yellow]")

        if self._channel:
            await self._channel.send_broadcast(
                "cancel_result", {"status": status}
            )

    async def _handle_files(self, payload: dict) -> None:
        """Handle file listing request."""
        data = payload.get("payload", {})
        path = data.get("path", self.bridge.work_dir)

        # Resolve '.' and relative paths to the agent's working directory
        if path == '.' or not path:
            path = self.bridge.work_dir
        elif not os.path.isabs(path):
            path = os.path.normpath(os.path.join(self.bridge.work_dir, path))

        console.print(f"[dim]Files: listing {path}[/dim]")

        try:
            result = self.bridge.list_files(path)
        except Exception as e:
            console.print(f"[red]Files error: {e}[/red]")
            result = {"error": str(e), "items": []}

        if self._channel:
            try:
                await self._channel.send_broadcast("files_result", result)
            except Exception as e:
                console.print(f"[red]Broadcast files_result error: {e}[/red]")

    async def _handle_read(self, payload: dict) -> None:
        """Handle file read request."""
        data = payload.get("payload", {})
        file_path = data.get("path", "")
        start = data.get("start_line", 1)
        end = data.get("end_line", None)

        console.print(f"[dim]Read: {file_path}[/dim]")

        try:
            result = self.bridge.read_file(file_path, start, end)
        except Exception as e:
            console.print(f"[red]Read error: {e}[/red]")
            result = {"error": str(e)}

        if self._channel:
            try:
                await self._channel.send_broadcast("read_result", result)
            except Exception as e:
                console.print(f"[red]Broadcast read_result error: {e}[/red]")

    async def _handle_shell(self, payload: dict) -> None:
        """Handle shell command execution."""
        data = payload.get("payload", {})
        command = data.get("command", "")
        timeout = data.get("timeout", 60)
        conversation_id = data.get("conversation_id", "")

        if not command:
            return

        console.print(f"[bold yellow]Shell:[/bold yellow] {command}")

        async def on_line(line: str) -> None:
            if self._channel:
                await self._channel.send_broadcast(
                    "output",
                    {
                        "conversation_id": conversation_id,
                        "line": line,
                        "timestamp": time.time(),
                    },
                )

        result = await self.bridge.run_shell(command, timeout=timeout, on_line=on_line)

        if self._channel:
            await self._channel.send_broadcast(
                "result",
                {
                    "conversation_id": conversation_id,
                    **result.to_dict(),
                },
            )

    async def _handle_ping(self, payload: dict) -> None:
        """Respond to ping with agent status."""
        tools = discover_all_tools()

        if self._channel:
            await self._channel.send_broadcast(
                "pong",
                {
                    "agent_id": self._agent_id,
                    "hostname": platform.node(),
                    "os": platform.system().lower(),
                    "work_dir": self.bridge.work_dir,
                    "is_busy": self.bridge.is_busy,
                    "tools": [t.to_dict() for t in tools],
                    "model_choices": TOOL_MODELS,
                    "timestamp": time.time(),
                },
            )

    async def _handle_set_workdir(self, payload: dict) -> None:
        """Handle working directory change."""
        data = payload.get("payload", {})
        new_dir = data.get("path", "")

        if not new_dir:
            return

        if not os.path.isabs(new_dir):
            new_dir = os.path.normpath(os.path.join(self.bridge.work_dir, new_dir))

        if not os.path.isdir(new_dir):
            if self._channel:
                await self._channel.send_broadcast(
                    "error", {"message": f"Directory not found: {new_dir}"}
                )
            return

        old_dir = self.bridge.work_dir
        self.bridge.work_dir = os.path.abspath(new_dir)

        # Update in database
        if self._supabase and self._agent_id:
            await self._supabase.table("agents").update(
                {"work_dir": self.bridge.work_dir}
            ).eq("id", self._agent_id).execute()

        if self._channel:
            await self._channel.send_broadcast(
                "workdir_changed",
                {"old": old_dir, "new": self.bridge.work_dir},
            )

        console.print(f"[green]Workdir: {old_dir} -> {self.bridge.work_dir}[/green]")

    # ---- Heartbeat ----

    async def _heartbeat_loop(self, interval: int = 30) -> None:
        """Send periodic heartbeat to keep agent status fresh."""
        refresh_counter = 0
        while self._running:
            try:
                if self._supabase and self._agent_id:
                    await self._supabase.table("agents").update({
                        "is_online": True,
                        "last_seen_at": "now()",
                    }).eq("id", self._agent_id).execute()

                # Proactively refresh auth tokens every ~50 minutes
                # (Supabase tokens expire after 60 min)
                refresh_counter += 1
                if refresh_counter >= (50 * 60 // interval):
                    refresh_counter = 0
                    if self._supabase:
                        try:
                            await self._supabase.auth.refresh_session()
                        except Exception:
                            pass  # Token listener will persist on success
            except Exception:
                pass  # Silently retry on next heartbeat
            await asyncio.sleep(interval)

    # ---- Main run loop ----

    async def run(self) -> None:
        """Connect and listen forever. Main entry point for `synapse start`."""
        self._running = True

        await self.connect()

        console.print("\n[bold green]Synapse Agent is running[/bold green]")
        console.print("[dim]Press Ctrl+C to stop[/dim]\n")

        heartbeat = asyncio.create_task(self._heartbeat_loop())

        try:
            # Keep running until interrupted
            while self._running:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, asyncio.CancelledError):
            pass
        finally:
            self._running = False
            heartbeat.cancel()
            await self._disconnect()

    async def _disconnect(self) -> None:
        """Clean shutdown -- mark agent offline, unsubscribe."""
        console.print("\n[yellow]Shutting down...[/yellow]")

        # Mark agent as offline
        if self._supabase and self._agent_id:
            try:
                await self._supabase.table("agents").update({
                    "is_online": False,
                }).eq("id", self._agent_id).execute()
            except Exception:
                pass

        # Unsubscribe from channel
        if self._channel:
            try:
                await self._channel.unsubscribe()
            except Exception:
                pass

        console.print("[green]Agent stopped[/green]")
