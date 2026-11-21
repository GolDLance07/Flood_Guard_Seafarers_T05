import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    # Load .env from project root if present
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
RAW_DATA_DIR = DATA_DIR / "raw"
METADATA_DIR = DATA_DIR / "metadata"

_cors_env = os.environ.get("CORS_ORIGINS")
if _cors_env:
    CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

API_VERSION = "1.0.0"
DEFAULT_EVENT_ID = "kerala-2018-demo"

# Live Environmental Monitoring Configuration (Official Portals)
IMD_BASE_URL = os.environ.get("IMD_BASE_URL", "https://api.imd.gov.in/api/v1")
IMD_API_KEY = os.environ.get("IMD_API_KEY", "")
IMD_BEARER_TOKEN = os.environ.get("IMD_BEARER_TOKEN", "")

CWC_API_URL = os.environ.get("CWC_API_URL", "https://ffs.india-water.gov.in")
NWIC_API_URL = os.environ.get("NWIC_API_URL", "https://nwdp.nwic.gov.in")

SACHET_BASE_URL = os.environ.get("SACHET_BASE_URL", "https://sachet.ndma.gov.in")

COPERNICUS_CATALOGUE_URL = os.environ.get(
    "COPERNICUS_CATALOGUE_URL",
    "https://catalogue.dataspace.copernicus.eu/odata/v1"
)
COPERNICUS_STAC_URL = os.environ.get(
    "COPERNICUS_STAC_URL",
    "https://catalogue.dataspace.copernicus.eu/stac"
)
