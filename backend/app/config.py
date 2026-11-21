import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
RAW_DATA_DIR = DATA_DIR / "raw"
METADATA_DIR = DATA_DIR / "metadata"

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
