"""Local stand-in for Instagram OAuth + Graph API, for end-to-end runs only.

Run: python scripts/fake_instagram.py, then start the API with
IG_OAUTH_AUTHORIZE_URL=http://localhost:8090/oauth/authorize
IG_OAUTH_TOKEN_URL=http://localhost:8090/oauth/access_token
IG_GRAPH_BASE_URL=http://localhost:8090
"""
import json
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

PORT = 8090
BASE = f"http://localhost:{PORT}"
TOKEN = "fake-long-lived-token"
REQUESTS: list[str] = []

CAPTIONS = [
    "3 mistakes killing your squat depth #fitness #legday #gymtips",
    "Full upper body workout in 20 minutes #fitness #workout #homeworkout",
    "What I eat in a day to build muscle #nutrition #fitness #highprotein",
    "Stop doing crunches. Do this instead #core #abs #fitness",
    "Beginner gym routine that actually works #gym #beginner #fitness",
    "How I fixed my deadlift form #deadlift #strength #fitness",
    "Morning mobility flow for desk workers #mobility #stretching #fitness",
    "5 protein snacks under 200 calories #nutrition #mealprep #fitness",
]
MEDIA = []
now = datetime.now(timezone.utc)
for i in range(30):
    kind = "VIDEO" if i % 3 != 2 else "IMAGE"  # 20 reels, 10 photos
    MEDIA.append({
        "id": f"1790000000{i:04d}",
        "caption": CAPTIONS[i % len(CAPTIONS)],
        "media_type": kind,
        "media_product_type": "REELS" if kind == "VIDEO" else "FEED",
        "media_url": f"{BASE}/media/{i}.mp4",
        "thumbnail_url": f"{BASE}/img/{i}.svg",
        "permalink": f"https://www.instagram.com/reel/FAKE{i:04d}/",
        "timestamp": (now - timedelta(days=i * 2)).strftime("%Y-%m-%dT%H:%M:%S+0000"),
    })

COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#22c55e", "#ef4444", "#eab308"]


class Handler(BaseHTTPRequestHandler):
    def _json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _query(self):
        parsed = urlparse(self.path)
        return parsed.path, {k: v[0] for k, v in parse_qs(parsed.query).items()}

    def _check_token(self, q):
        if q.get("access_token") != TOKEN:
            self._json({"error": {"message": "Invalid OAuth access token.", "type": "OAuthException", "code": 190}}, 400)
            return False
        return True

    def log_message(self, fmt, *args):
        line = self.path.split("?")[0]
        REQUESTS.append(f"{self.command} {line}")
        print(f"[fake-ig] {self.command} {line}", flush=True)

    def do_GET(self):
        path, q = self._query()
        if path == "/oauth/authorize":
            allow = q["redirect_uri"] + "?" + urlencode({"code": "fake-auth-code#_", "state": q["state"]})
            deny = q["redirect_uri"] + "?" + urlencode({"error": "access_denied", "state": q["state"]})
            html = f"""<!doctype html><title>Instagram (fake)</title>
<h1>Fake Instagram</h1><p>Reelysis wants access to <b>fitcoach_demo</b> (scopes: {q.get('scope')})</p>
<a id="allow" href="{allow}">Allow</a> | <a id="deny" href="{deny}">Cancel</a>"""
            body = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path == "/access_token":
            self._json({"access_token": TOKEN, "token_type": "bearer", "expires_in": 5184000})
        elif path == "/refresh_access_token":
            if self._check_token(q):
                self._json({"access_token": TOKEN, "token_type": "bearer", "expires_in": 5184000})
        elif path == "/me":
            if self._check_token(q):
                self._json({
                    "id": "17841400000000001", "username": "fitcoach_demo", "account_type": "BUSINESS",
                    "name": "Fit Coach Demo", "profile_picture_url": f"{BASE}/img/avatar.svg",
                    "followers_count": 12840, "media_count": len(MEDIA),
                    "biography": "Strength coach. Simple workouts and high-protein meals.",
                })
        elif path == "/me/media":
            if not self._check_token(q):
                return
            limit, after = int(q.get("limit", 25)), int(q.get("after", 0))
            page = MEDIA[after:after + limit]
            payload = {"data": page}
            if after + limit < len(MEDIA):
                payload["paging"] = {"next": f"{BASE}/me/media?" + urlencode({**q, "after": after + limit})}
            self._json(payload)
        elif path.endswith("/insights"):
            if not self._check_token(q):
                return
            idx = int(path.split("/")[1][-4:])
            views = 4000 + idx * 731 % 9000
            values = {"reach": int(views * 0.8), "views": views, "likes": views // 12, "comments": views // 150,
                      "saved": views // 90, "shares": views // 110}
            values["total_interactions"] = sum(values[k] for k in ("likes", "comments", "saved", "shares"))
            self._json({"data": [{"name": k, "period": "lifetime", "values": [{"value": v}]} for k, v in values.items()]})
        elif path.startswith("/img/"):
            name = path.rsplit("/", 1)[1].split(".")[0]
            color = COLORS[(hash(name) % len(COLORS))]
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="100%" height="100%" fill="{color}"/><text x="50%" y="50%" font-size="40" text-anchor="middle" fill="white">{name}</text></svg>'
            body = svg.encode()
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path == "/_requests":
            self._json(REQUESTS)
        else:
            self._json({"error": {"message": f"unknown path {path}", "code": 100}}, 404)

    def do_POST(self):
        path, _ = self._query()
        length = int(self.headers.get("Content-Length", 0))
        form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode()).items()}
        if path == "/oauth/access_token":
            if form.get("code") != "fake-auth-code#_" or form.get("grant_type") != "authorization_code":
                self._json({"error_type": "OAuthException", "code": 400, "error_message": "Invalid code"}, 400)
                return
            self._json({"access_token": "fake-short-lived-token", "user_id": 17841400000000001, "permissions": []})
        else:
            self._json({"error": "unknown"}, 404)


if __name__ == "__main__":
    print(f"fake instagram on {BASE}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
