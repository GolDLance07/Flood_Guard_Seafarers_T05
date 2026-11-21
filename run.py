import sys
import os
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
except ImportError:
    pass

import uvicorn

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))

    print("=" * 60)
    print("🚀 Starting FloodGuard Server...")
    print(f"   Interactive Command Center: http://localhost:{port}/app")
    print(f"   Interactive API Docs:       http://localhost:{port}/docs")
    print(f"   Health Check:               http://localhost:{port}/api/health")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)
