import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app
import re

client = TestClient(app)

print("--- Testing Routes ---")
r_root = client.get('/', headers={'Accept': 'text/html'})
print("GET / (text/html):", r_root.status_code, len(r_root.content))

r_app = client.get('/app')
print("GET /app:", r_app.status_code, len(r_app.content))

r_api = client.get('/api/overview')
print("GET /api/overview:", r_api.status_code)

r_health = client.get('/api/health')
print("GET /api/health:", r_health.status_code, r_health.json())

# Check assets referenced in index.html
html = r_app.text
matches = re.findall(r'(?:src|href)="([^"]+)"', html)
for m in matches:
    if m.startswith('/assets/'):
        r_asset = client.get(m)
        print(f"Asset {m} -> Status: {r_asset.status_code}, Length: {len(r_asset.content)}")
    else:
        print(f"Other link: {m}")
