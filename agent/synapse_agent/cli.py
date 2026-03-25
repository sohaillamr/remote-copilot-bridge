"""
CLI entry point for the Synapse Agent.

Commands:
    synapse login    - Authenticate with Synapse (email magic link)
    synapse start    - Start listening for prompts
    synapse status   - Show connection && tool status
    synapse tools    - List detected AI CLI tools
    synapse logout   - Clear stored credentials
"""

from __future__ import annotations

import asyncio
import sys
import webbrowser

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from synapse_agent import __version__
from synapse_agent.config import (
    load_config,
    save_config,
    clear_auth,
    is_authenticated,
    ensure_config_dir,
    SYNAPSE_SUPABASE_URL,
    SYNAPSE_SUPABASE_ANON_KEY,
)
from synapse_agent.tools import discover_all_tools, TOOL_REGISTRY

console = Console()


@click.group()
@click.version_option(version=__version__, prog_name="synapse-agent")
def main():
    """Synapse Agent - Connect your AI CLI tools to the web."""
    pass


# --- synapse login -------------------------------------------------------

@main.command()
def login():
    """Authenticate with your Synapse account (email magic link)."""
    import requests

    ensure_config_dir()

    # Check if already logged in
    if is_authenticated():
        config = load_config()
        console.print(f"[dim]Already logged in as [bold]{config.get('user_email', 'unknown')}[/bold][/dim]")
        if not click.confirm("Log in again?", default=False):
            return

    console.print()
    console.print(Panel.fit(
        "[bold cyan]Synapse Login[/bold cyan]\n"
        "[dim]Opening your browser to securely connect your account...[/dim]",
        border_style="cyan",
    ))
    console.print()

    from synapse_agent.auth_server import CALLBACK_PORT, wait_for_auth_callback
    import webbrowser

    login_url = f"https://synapse-green.vercel.app/cli-login?port={CALLBACK_PORT}"

    console.print(f"  If your browser does not open automatically, visit this link:")
    console.print(f"  [blue underline]{login_url}[/blue underline]\n")

    try:
        webbrowser.open_new(login_url)
    except Exception:
        pass

    # Wait for the browser to redirect back
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        progress.add_task(description="Waiting for browser authentication...", total=None)
        tokens = wait_for_auth_callback(timeout=300)

    if not tokens or not tokens.get("access_token"):
        console.print("[red]  Timed out waiting for login. Please try again.[/red]")
        sys.exit(1)

    access_token = tokens["access_token"]
    
    # decode JWT to get email
    try:
        import base64
        import json
        payload = access_token.split(".")[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload).decode())
        user_email = claims.get("email", "unknown")
    except Exception:
        user_email = "unknown"

    # Save tokens
    config = load_config()
    config["access_token"] = access_token
    config["refresh_token"] = tokens.get("refresh_token", "")
    config["user_email"] = user_email
    save_config(config)

    console.print(f"  [bold green]Logged in as [white]{user_email}[/white]![/bold green]")
    console.print("  [dim]Run [bold]synapse start[/bold] to connect your tools.[/dim]")
    console.print()


# --- synapse start --------------------------------------------------------

@main.command()
@click.option("--work-dir", "-d", default=None, help="Working directory for tool execution")
def start(work_dir: str | None):
    """Start the agent and listen for prompts from the web portal."""
    if not is_authenticated():
        console.print("[red]  Not authenticated. Run [bold]synapse login[/bold] first.[/red]")
        sys.exit(1)

    config = load_config()

    # Show banner
    console.print()
    console.print(Panel.fit(
        "[bold cyan]Synapse Agent[/bold cyan]\n"
        f"[dim]v{__version__} | {config.get('user_email', '')}[/dim]",
        border_style="cyan",
    ))

    # Update work dir if provided
    if work_dir:
        from synapse_agent.config import set_value
        set_value("work_dir", work_dir)

    # Discover tools
    tools = discover_all_tools()
    if tools:
        table = Table(title="Detected Tools", show_header=True)
        table.add_column("Tool", style="cyan")
        table.add_column("Path", style="dim")
        for t in tools:
            table.add_row(t.name, t.binary_path)
        console.print(table)
    else:
        console.print("[yellow]  No AI CLI tools detected.[/yellow]")
        console.print("[dim]  Install one: npm install -g @github/copilot[/dim]")

    console.print()

    # Start the relay
    from synapse_agent.relay import SynapseRelay
    relay = SynapseRelay()

    if work_dir:
        relay.bridge.work_dir = work_dir

    try:
        asyncio.run(relay.run())
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopped.[/yellow]")


# --- synapse status -------------------------------------------------------

@main.command()
def status():
    """Show agent connection status and detected tools."""
    config = load_config()

    auth_status = (
        f"[green]Logged in as [bold]{config.get('user_email', 'unknown')}[/bold][/green]"
        if is_authenticated()
        else "[red]Not authenticated[/red]"
    )
    agent_id = config.get("agent_id", "Not registered")
    work_dir = config.get("work_dir", "Not set")

    console.print()
    console.print(Panel.fit(
        f"[bold]Synapse Agent Status[/bold]\n\n"
        f"Auth:      {auth_status}\n"
        f"Agent ID:  [dim]{agent_id}[/dim]\n"
        f"Work Dir:  [dim]{work_dir}[/dim]",
        border_style="blue",
    ))

    # Show tools
    tools = discover_all_tools()
    if tools:
        table = Table(title="Detected Tools", show_header=True)
        table.add_column("Tool", style="cyan")
        table.add_column("Path", style="dim")
        for t in tools:
            table.add_row(t.name, t.binary_path)
        console.print(table)
    else:
        console.print("[yellow]No AI CLI tools detected.[/yellow]")

    console.print()


# --- synapse tools --------------------------------------------------------

@main.command()
def tools():
    """List all known AI CLI tools and their detection status."""
    table = Table(title="AI CLI Tools", show_header=True)
    table.add_column("Tool", style="bold")
    table.add_column("Status", justify="center")
    table.add_column("Binary Path", style="dim")
    table.add_column("Install", style="dim")

    from synapse_agent.tools import find_tool_binary

    for name, meta in TOOL_REGISTRY.items():
        binary = find_tool_binary(name)
        if binary:
            status = "[green]Found[/green]"
            path = binary
        else:
            status = "[red]Not found[/red]"
            path = "-"
        table.add_row(
            meta["display_name"],
            status,
            path,
            meta.get("install_hint", ""),
        )

    console.print(table)


# --- synapse logout -------------------------------------------------------

@main.command()
def logout():
    """Clear stored credentials."""
    clear_auth()
    console.print("[green]  Logged out. Credentials cleared.[/green]")


if __name__ == "__main__":
    main()
