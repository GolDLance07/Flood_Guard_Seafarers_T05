# FloodGuard — Hybrid Flood Intelligence & Live Environmental Monitoring Platform

FloodGuard combines satellite radar observations and real-time environmental telemetry to deliver dual-mode disaster intelligence:
1. **Mode A: Historical Event Analysis (Kerala August 2018):** Ingests multi-temporal Sentinel-1 C-SAR radar observations, performs permanent water subtraction, maps exposed roads and facilities, and computes topological candidate rescue routes with strict flood avoidance.
2. **Mode B: Live Environmental Monitoring:** Ingests live meteorological precipitation, river basin inflow discharge simulations (Copernicus CEMS GloFAS), and automated Sentinel-1 SAR acquisition pass tracking for the Alappuzha & Kuttanad delta.

---

## 1. System Architecture

```
FloodGuard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & static mount
│   │   ├── config.py            # Environment & paths
│   │   ├── api/                 # /api endpoints (health, events, overview, flood, impact, facilities, routes, reports, live)
│   │   ├── services/            # DataLoader, RoutingService, LiveMonitoringService
│   │   └── schemas/             # Pydantic contract validation
│   ├── tests/                   # Pytest suite (18 tests verifying historical & live contracts)
│   └── requirements.txt         # Pinned backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # MapComponent (MapLibre), Header, LayerControls
│   │   ├── components/workspaces# Overview, Historical/Impact, LiveMonitoring, Rescue, Evidence
│   │   ├── services/api.ts      # Typed API client connecting to FastAPI
│   │   └── types/api.ts         # TypeScript API contracts
│   ├── package.json             # React 19 + TypeScript + Vite + Tailwind CSS + MapLibre
│   └── dist/                    # Production bundle
├── data/
│   ├── raw/                     # Original S1 metadata, OSM road network, KSDMA flood layers
│   ├── processed/               # Flood extent polygons, affected roads, facilities, routing graph
│   └── metadata/                # Dataset provenance catalog & demo manifest
├── scripts/
│   ├── run_pipeline.py          # Geospatial processing pipeline
│   ├── prepare_demo.py          # Asset validator & SHA-256 integrity check
│   └── verify_datasets.py       # API access verifier
└── docs/                        # Complete technical and data verification documentation
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.11+ (Python 3.14 compatible)
- Node.js 18+ and npm

### Step 1: Run the Backend & Dashboard

From the repository root:
```bash
# Start FastAPI (serves API endpoints on /api and the interactive frontend on / or /app)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Open your browser to:
- **Interactive Command Center:** [http://localhost:8000/app](http://localhost:8000/app) (or [http://localhost:8000/](http://localhost:8000/))
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Service Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 2 (Optional): Run Frontend in Dev Mode with Hot Reload
```bash
cd frontend
npm run dev
# Dashboard opens on http://localhost:5173
```

### Step 3: Run Test Suite & Demo Validation
```bash
# Run backend pytest suite (all 18 tests)
python -m pytest backend/tests -v

# Run demo asset integrity verification
python scripts/prepare_demo.py
```

---

## 3. Data Provenance & Verification

| Layer | Product / Identifier | Source / Authority | Verification Status |
|---|---|---|---|
| **Sentinel-1 Event** | `S1A_IW_GRDH_1SDV_20180821T004109` | Copernicus Data Space (ESA) | Verified metadata; Orbit 144, Ascending pass, Dual VV+VH |
| **Sentinel-1 Baseline** | `S1A_IW_GRDH_1SDV_20180809T004108` | Copernicus Data Space (ESA) | Verified metadata; 12-day repeat orbit baseline matching event geometry |
| **Inundation Extent** | `ALPZA_FD.geojson` | KSDMA / Kerala PWD GIS / ISRO NRSC | Verified & Downloaded; 129 flood features in AOI |
| **Permanent Water** | `kpwd.gis-waterbodies.geojson` | Kerala PWD GIS | Verified & Downloaded; 29 waterbodies (Vembanad Lake network) |
| **Road Network** | OpenStreetMap Overpass Extract | OpenStreetMap Contributors | Verified & Downloaded; 11,870 road segments with coordinates |
| **Critical Facilities** | OSM Health & Emergency Amenities | OpenStreetMap Contributors | Verified & Downloaded; 324 facilities in AOI |
| **Population Exposure**| Census India / WorldPop 2018 | WorldPop Hub / Census India | Verified; Calibrated settlement density overlay (~1,480 / km²) |

---

## 4. Key Metrics (Alappuzha AOI)

- **Total Mapped Inundation:** `38,656.52 ha` (`386.57 km²`)
- **Permanent Water Treatment:** Excluded pre-existing waterbodies (Vembanad Lake & canals) with topological validity cleaning
- **Estimated Exposed Population:** `~257,456 persons` (calibrated density: 386.57 km² × 1,480 pop/km² × 0.45 settlement coefficient)
- **Affected Road Network:** `713.06 km` (`2,619 intersecting segments`)
- **Critical Facilities in Inundation Zone:** `38 facilities` (including `28 hospitals and primary clinics` + `10 pharmacies/health services`) out of 324 total facilities

---

## 5. Non-Negotiable Safety Disclaimer

> **Candidate route only. Road conditions and passability require ground verification by local authorities or emergency response teams.**
> Mapped routes identify topologically open road segments based on August 21, 2018 satellite radar observations. FloodGuard is a historical decision-support prototype and does not certify road structural integrity, water depth, or live emergency passability.

---

## 6. 90-Second Demo Narrative

1. **Orientation (0–15s):** Open [http://localhost:8000/app](http://localhost:8000/app). Point out the dark command-center theme and the Alappuzha wetland basin event badge (`Aug 2018 Event`).
2. **Satellite Observations (15–35s):** Toggle the **Flood Extent** layer. Explain the multi-temporal Sentinel-1 C-SAR comparison (Aug 21 event vs. Aug 9 baseline) and note that permanent water (Vembanad Lake) was explicitly subtracted.
3. **Impact Assessment (35–55s):** Review the KPI strip: `38,657 ha` flooded, `~257k` people exposed, `713 km` of roads affected, and `38 critical facilities` in the flood zone (`28 hospitals`). Switch to the **Impact** tab in the side drawer to inspect the list of healthcare facilities directly in the flood zone.
4. **Rescue Intelligence (55–75s):** Switch to the **Rescue Routing** tab. Click *"Load Sample Route"* and *"Compute Candidate Route"*. Point out the green candidate route navigating around inundated roads, and highlight the prominent orange safety disclaimer.
5. **Data Provenance (75–90s):** Switch to the **Evidence** tab to show real Sentinel-1 scene IDs, orbit metadata, and limitations. Show that all metrics are live-queried from the FastAPI backend with zero mock data.
