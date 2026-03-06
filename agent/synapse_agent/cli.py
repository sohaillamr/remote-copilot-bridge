"""
CLI entry point for the Synapse Agent.

Commands:
    synapse login    — Authenticate with Synapse (opens browser)
    synapse start    — Start listening for prompts
    synapse status   — Show connection & tool status
    synapse tools    — List detected AI CLI tools
    synapse logout   — Clear stored credentials
"""

from __future__ import annotations

import asyncio
import sys
import webbrowser

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from synapse_agent import __version__
from synapse_agent.config import (
    load_config,
    save_config,
    clear_auth,
    is_authenticated,
    ensure_config_dir,
)
from synapse_agent.tools import discover_all_tools, TOOL_REGISTRY

console = Console()


@click.group()
@click.version_option(version=__version__, prog_name="synapse-agent")
def main():
    """Synapse Agent — Connect your AI CLI tools to the web."""
    pass


# ─── synapse login ────────────────────────────────────────────────────────


@main.command()
@click.option("--url", prompt="Supabase URL", help="Your Supabase project URL")
@click.option("--key", prompt="Supabase Anon Key", help="Your Supabase anon/public key")
def login(url: str, key: str):
    """Authenticate with your Synapse account."""
    ensure_config_dir()

    config = load_config()
    config["supabase_url"] = url.strip().rstrip("/")
    config["supabase_anon_key"] = key.strip()
    save_config(config)

    # Open browser for OAuth login
    login_url = f"{config['supabase_url']}/auth/v1/authorize?provider=github"
    console.print(f"\n[bold]Opening browser for authentication...[/bold]")
    console.print(f"[dim]If it doesn't open, visit: {login_url}[/dim]\n")

    webbrowser.open(login_url)

    # For now, prompt for the token manually
    # In production, this would use a local HTTP callback server
    console.print("[yellow]After logging in, paste your access token below.[/yellow]")
    access_token = click.prompt("Access Token", hide_input=True)
    refresh_token = click.prompt("Refresh Token (optional)", default="", hide_input=True)

    config["access_token"] = access_token
    config["refresh_token"] = refresh_token
    save_config(config)

    console.print("\n[bold green]✅ Logged in successfully![/bold green]")
    console.print("[dim]Run 'synapse start' to connect your tools.[/dim]")


# ─── synapse start ────────────────────────────────────────────────────────


@main.command()
@click.option("--work-dir", "-d", default=None, help="Working directory for tool execution")
def start(work_dir: str | None):
    """Start the agent and listen for prompts from the web portal."""
    if not is_authenticated():
        console.print("[red]❌ Not authenticated. Run 'synapse login' first.[/red]")
        sys.exit(1)

    # Show banner
    console.print(Panel.fit(
        "[bold cyan]⚡ Synapse Agent[/bold cyan]\n"
        f"[dim]v{__version__}[/dim]",
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
        console.print("[yellow]⚠️  No AI CLI tools detected.[/yellow]")
        console.print("[dim]Install one: npm install -g @github/copilot[/dim]")

    # Start the relay
    from synapse_agent.relay import SynapseRelay
    relay = SynapseRelay()

    if work_dir:
        relay.bridge.work_dir = work_dir

    try:
        asyncio.run(relay.run())
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopped.[/yellow]")


# ─── synapse status ───────────────────────────────────────────────────────


@main.command()
def status():
    """Show agent connection status and detected tools."""
    config = load_config()

    auth_status = "[green]✅ Authenticated[/green]" if is_authenticated() else "[red]❌ Not authenticated[/red]"
    supabase_url = config.get("supabase_url", "Not configured")
    agent_id = config.get("agent_id", "Not registered")
    work_dir = config.get("work_dir", "Not set")

    console.print(Panel.fit(
        f"[bold]Synapse Agent Status[/bold]\n\n"
        f"Auth:      {auth_status}\n"
        f"Supabase:  [dim]{supabase_url}[/dim]\n"
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


# ─── synapse tools ────────────────────────────────────────────────────────


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
            status = "[green]✅ Found[/green]"
            path = binary
        else:
            status = "[red]❌ Not found[/red]"
            path = "—"
        table.add_row(
            meta["display_name"],
            status,
            path,
            meta.get("install_hint", ""),
        )

    console.print(table)


# ─── synapse logout ───────────────────────────────────────────────────────


@main.command()
def logout():
    """Clear stored credentials."""
    clear_auth()
    console.print("[green]✅ Logged out. Credentials cleared.[/green]")


if __name__ == "__main__":
    main()
