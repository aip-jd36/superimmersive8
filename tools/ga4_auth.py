#!/usr/bin/env python3
"""One-time OAuth2 flow to get a GA4-scoped token. Saves to ga4_token.json."""

import json, ssl, urllib.request, urllib.parse, webbrowser, http.server, threading, os
import certifi

ssl_ctx = ssl.create_default_context(cafile=certifi.where())

CLIENT_SECRETS_FILE = "/Users/JD/Downloads/client_secret_1000141363620-nc8k5vrtq2cuc2orqf7r05sbvbfcsqso.apps.googleusercontent.com.json"
TOKEN_FILE = "/Users/JD/Desktop/SuperImmersive8/tools/ga4_token.json"
REDIRECT_URI = "http://localhost:8085/"
SCOPE = "https://www.googleapis.com/auth/analytics.readonly"

with open(CLIENT_SECRETS_FILE) as f:
    secrets = json.load(f)

installed = secrets.get("installed", secrets.get("web", {}))
CLIENT_ID = installed["client_id"]
CLIENT_SECRET = installed["client_secret"]

auth_code = None

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        auth_code = params.get("code", [None])[0]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"<h2>Authenticated! You can close this tab.</h2>")
    def log_message(self, *args): pass

server = http.server.HTTPServer(("localhost", 8085), Handler)
threading.Thread(target=server.handle_request, daemon=True).start()

auth_url = "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode({
    "response_type": "code",
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    "scope": SCOPE,
    "access_type": "offline",
    "prompt": "consent"
})

print("Opening browser for GA4 auth...")
webbrowser.open(auth_url)
print("Waiting for approval (approve in browser)...")

import time
for _ in range(60):
    if auth_code:
        break
    time.sleep(1)

if not auth_code:
    print("Timed out waiting for auth.")
    exit(1)

# Exchange code for tokens
data = urllib.parse.urlencode({
    "code": auth_code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code"
}).encode()

req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
with urllib.request.urlopen(req, context=ssl_ctx) as r:
    tokens = json.loads(r.read())

with open(TOKEN_FILE, "w") as f:
    json.dump(tokens, f)

print(f"Token saved to {TOKEN_FILE}")
print("Access token expires in:", tokens.get("expires_in"), "seconds")
print("Refresh token present:", bool(tokens.get("refresh_token")))
