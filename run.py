import sys
import os
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting FloodGuard Server...")
    print("   Interactive Command Center: http://localhost:8000/app")
    print("   Interactive API Docs:       http://localhost:8000/docs")
    print("   Health Check:               http://localhost:8000/api/health")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
