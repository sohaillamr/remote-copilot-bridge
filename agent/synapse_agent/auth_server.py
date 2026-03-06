"""
Local HTTP callback server for OAuth / magic-link login.

Flow:
1. CLI sends magic link to user's email via Supabase
2. This server listens on localhost:7890
3. User clicks the link → Supabase redirects to http://localhost:7890/callback#access_token=...
4. We serve a tiny HTML page that reads the URL fragment and POSTs it back
5. Server receives the tokens, stores them, and shuts down
"""

from __future__ import annotations

import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any


# Will be filled by the callback
_captured_tokens: dict[str, Any] = {}
_server_done = threading.Event()

CALLBACK_PORT = 7890

CALLBACK_HTML = """<!DOCTYPE html>
<html>
<head>
    <title>Synapse – Login</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; margin: 0;
            background: #0a0a0f; color: #e0e0e0;
        }
        .card {
            text-align: center; padding: 3rem;
            background: #12121a; border-radius: 1rem;
            border: 1px solid rgba(255,255,255,0.06);
            max-width: 400px;
        }
        .card h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .card p { color: #888; font-size: 0.9rem; }
        .success { color: #34d399; }
        .error { color: #f87171; }
    </style>
</head>
<body>
    <div class="card" id="card">
        <h1>⏳ Completing login...</h1>
        <p>Please wait.</p>
    </div>
    <script>
        (async () => {
            const card = document.getElementById('card');
            try {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');
                const expires_in = params.get('expires_in');

                if (!access_token) {
                    card.innerHTML = '<h1 class="error">❌ Login failed</h1><p>No token received. Please try again.</p>';
                    return;
                }

                const res = await fetch('/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token, refresh_token, expires_in })
                });

                if (res.ok) {
                    card.innerHTML = '<h1 class="success">✅ Logged in!</h1><p>You can close this tab and return to your terminal.</p>';
                } else {
                    card.innerHTML = '<h1 class="error">❌ Something went wrong</h1><p>Please try again.</p>';
                }
            } catch (e) {
                card.innerHTML = '<h1 class="error">❌ Error</h1><p>' + e.message + '</p>';
            }
        })();
    </script>
</body>
</html>"""


class _CallbackHandler(BaseHTTPRequestHandler):
    """Handles the OAuth callback redirect."""

    def log_message(self, format: str, *args: Any) -> None:
        """Suppress default HTTP logging."""
        pass

    def do_GET(self) -> None:
        """Serve the callback HTML page that reads the URL fragment."""
        if self.path.startswith("/callback"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(CALLBACK_HTML.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self) -> None:
        """Receive the tokens from the callback page's JavaScript."""
        if self.path == "/token":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                _captured_tokens.update(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok": true}')
                # Signal that we got the tokens
                _server_done.set()
            except Exception:
                self.send_response(400)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()


def wait_for_auth_callback(timeout: int = 300) -> dict[str, Any] | None:
    """
    Start a local HTTP server and wait for the auth callback.

    Returns the captured tokens dict, or None on timeout.
    """
    global _captured_tokens
    _captured_tokens = {}
    _server_done.clear()

    server = HTTPServer(("127.0.0.1", CALLBACK_PORT), _CallbackHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    try:
        got_it = _server_done.wait(timeout=timeout)
        if got_it:
            return dict(_captured_tokens)
        return None
    finally:
        server.shutdown()
        server_thread.join(timeout=2)
