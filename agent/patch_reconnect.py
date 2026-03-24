import re

path = r"C:\Users\dell\Desktop\synapse\agent\synapse_agent\relay.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the new content
new_heartbeat_and_run = '''    # ---- Heartbeat ----

    async def _heartbeat_loop(self, interval: int = 30) -> None:
        """Send periodic heartbeat to keep agent status fresh."""
        refresh_counter = 0
        error_count = 0
        while self._running:
            try:
                if self._supabase and self._agent_id:
                    await self._supabase.table("agents").update({
                        "is_online": True,
                        "last_seen_at": "now()",
                    }).eq("id", self._agent_id).execute()

                if self._channel:
                    # Send a health check broadcast to ensure the socket is actually writable
                    # If the socket is dead, this usually drops an exception
                    await self._channel.send_broadcast("health", {"status": "ok"})

                # Success, reset consecutive errors
                error_count = 0

                # Proactively refresh auth tokens every ~45 minutes
                refresh_counter += 1
                if refresh_counter >= (45 * 60 // interval):
                    refresh_counter = 0
                    if self._supabase:
                        try:
                            res = await self._supabase.auth.refresh_session()
                            session = getattr(res, "session", None) if res else None
                            # Update realtime auth if possible
                            if session and getattr(session, "access_token", None):
                                if hasattr(self._supabase, "realtime") and hasattr(self._supabase.realtime, "set_auth"):
                                    self._supabase.realtime.set_auth(session.access_token)
                        except Exception as e:
                            console.print(f"[dim]Token refresh info: {e}[/dim]")
            except Exception as e:
                error_count += 1
                console.print(f"[yellow]Heartbeat error ({error_count}): {e}[/yellow]")
                if error_count >= 3:
                    console.print("[red]Connection seems dead after continuous failures. Engaging reconnect...[/red]")
                    self._should_reconnect = True
                    return  # Break heartbeat
                    
            await asyncio.sleep(interval)

    # ---- Main run loop ----

    async def run(self) -> None:
        """Connect and listen forever. Main entry point for `synapse start`."""
        self._running = True

        loop = asyncio.get_running_loop()
        self._heartbeat_task = None

        def _handle_sig():
            asyncio.create_task(self._graceful_shutdown())

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _handle_sig)
            except NotImplementedError:
                pass

        while self._running:
            self._should_reconnect = False
            
            try:
                await self.connect()
                console.print("\\n[bold green]Synapse Agent is connected and listening[/bold green]")
                console.print("[dim]Press Ctrl+C to stop[/dim]\\n")

                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

                # Keep running until interrupted or reconnect requested
                while self._running and getattr(self, '_should_reconnect', False) is False:
                    await asyncio.sleep(1)
            except (KeyboardInterrupt, asyncio.CancelledError):
                self._running = False
            except Exception as e:
                console.print(f"[red]Exception in main run loop: {e}[/red]")
            finally:
                if self._heartbeat_task:
                    self._heartbeat_task.cancel()
                    self._heartbeat_task = None
                await self._disconnect()

            if self._running:
                console.print("[yellow]Reconnecting in 5 seconds...[/yellow]")
                await asyncio.sleep(5)

    async def _graceful_shutdown(self) -> None:
        """Handle OS signals for graceful shutdown."""
        console.print("\\n[yellow]Received shutdown signal...[/yellow]")
        self._running = False
        if getattr(self, '_heartbeat_task', None):
            self._heartbeat_task.cancel()
        # Cancel any running subprocess
        await self.bridge.cancel()
        await self._disconnect()'''

# Use regex to replace the section from # ---- Heartbeat ---- down to but not including async def _disconnect(self) -> None:
import re
pattern = re.compile(r"    # ---- Heartbeat ----.*?(?=    async def _disconnect\(self\) -> None:)", re.DOTALL)

# First confirm it matches
if not pattern.search(content):
    print("Error: Could not find the section to replace.")
    exit(1)

content = pattern.sub(new_heartbeat_and_run + "\n", content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("relay.py patched successfully to add auto-reconnection.")
