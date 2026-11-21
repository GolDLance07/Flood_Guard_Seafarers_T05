import os
import sys
from pathlib import Path

# Ensure root is in sys.path even when executed directly
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.config import CORS_ORIGINS, API_VERSION, BASE_DIR
from backend.app.api import health, events, overview, flood, impact, facilities, routes, reports, live, monitoring

app = FastAPI(
    title="FloodGuard API",
    description="Satellite-Based Flood Impact Assessment & Rescue Intelligence API",
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Handlers conforming to docs/03_API_CONTRACT.md
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {}
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "SCHEMA_VALIDATION_ERROR",
                "message": "Invalid request parameters or payload shape.",
                "details": {"errors": exc.errors()}
            }
        }
    )

# Register API routes
app.include_router(health.router)
app.include_router(events.router)
app.include_router(overview.router)
app.include_router(flood.router)
app.include_router(impact.router)
app.include_router(facilities.router)
app.include_router(routes.router)
app.include_router(reports.router)
app.include_router(live.router)
app.include_router(monitoring.router)

# Mount Frontend static files if built
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.api_route("/app", methods=["GET", "HEAD"])
    def serve_frontend_app():
        return FileResponse(FRONTEND_DIST / "index.html")

@app.api_route("/", methods=["GET", "HEAD"])
def root(request: Request):
    accept = request.headers.get("accept", "")
    # If a browser asks for text/html, serve the dashboard
    if "text/html" in accept and "application/json" not in accept and FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "service": "FloodGuard API",
        "version": API_VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting FloodGuard via backend/app/main.py...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
