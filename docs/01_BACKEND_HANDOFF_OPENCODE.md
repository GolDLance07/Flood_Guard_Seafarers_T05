# OpenCode Backend Handoff — FloodGuard Version A

## Mission

Build the complete backend and geospatial processing pipeline before frontend work begins. The backend must expose a stable, documented API and provide real, traceable outputs for one compact historical flood AOI.

Do not begin by generating a large generic codebase. First verify the data. Then implement the smallest end-to-end pipeline that can produce and serve a defensible result.

## Fixed project decisions

- Product: FloodGuard — Satellite-Based Flood Impact Assessment & Rescue Intelligence.
- Event candidate: Kerala floods, August 2018.
- Candidate focus: compact AOI in Alappuzha or Kottayam, Kerala, India.
- Candidate event image: Sentinel-1A around 21 August 2018.
- Pre-event baseline: select one or more compatible acquisitions only after checking actual scene metadata and coverage.
- Main workflow: SAR imagery → flood extent → permanent-water handling → exposure overlays → roads/facilities → optional candidate routes → FastAPI.
- One event and one AOI only for the MVP.
- No real-time prediction, no deep-learning requirement, no production-grade emergency dispatch.

## Phase 0 — Verify before coding (highest priority)

Create `docs/data_verification_log.md` and `data/metadata/datasets.json`.

For each candidate source, record:
- Exact source URL (not just homepage).
- Dataset/product name and identifier.
- Acquisition/publication date.
- AOI coverage.
- Spatial resolution and CRS.
- Polarisation, orbit direction and relative orbit for Sentinel-1.
- Processing level/product type.
- Access requirements, authentication and licence.
- Download status, file size and checksum.
- Whether the data is raw, analysis-ready, reference/validation, or contextual.
- Known limitations.

### Required verification tasks

1. Search Copernicus Data Space for Sentinel-1 GRD coverage over the candidate AOI and event date.
2. Find pre-event Sentinel-1 scenes with compatible orbit direction, relative orbit, polarisation and viewing geometry. Do not assume that any pre-event image is suitable.
3. Confirm that the chosen scene(s) cover the complete AOI.
4. Confirm download/authentication requirements and test an actual download.
5. Locate an official or credible reference flood extent for the same event/date/AOI. Check whether it is actually downloadable and whether its date matches the satellite acquisition.
6. Locate a permanent-water source if feasible. If unavailable, document the limitation and use a cautious alternative such as a known-water mask with source and date disclosed.
7. Verify WorldPop population raster coverage, year, resolution, licence and download path.
8. Verify OSM roads and facility coverage; record extraction date and Overpass/geofabrik source.
9. Optional: verify DEM source and use only if it adds value within the timebox.

**Do not treat the links listed in `docs/04_DATASET_CATALOGUE_AND_VERIFICATION_LINKS.md` as verified access or guaranteed downloads. They are research entry points. Complete the checks above and record evidence.**

## Phase 1 — Data ingestion and preprocessing

Preferred input: Sentinel-1 GRD, or a clearly documented analysis-ready Sentinel-1 product if raw GRD processing cannot be completed in time.

For GRD, use a defensible processing workflow (ESA SNAP or a reproducible Python/GDAL workflow):
- Apply orbit file where available.
- Thermal-noise removal and radiometric calibration as appropriate to product/workflow.
- Speckle filtering only if justified; avoid over-smoothing flood boundaries.
- Terrain correction / geocoding.
- Align pre-event and event rasters to the same grid, CRS, resolution and extent.
- Record processing parameters and software versions.
- Use compatible acquisition geometry. Do not compare arbitrary scenes.
- Keep source files immutable; write derived outputs to `data/processed/`.

If using analysis-ready RTC, document provider, processing level, units, resolution, and any differences from GRD.

## Phase 2 — Flood detection

Implement a transparent baseline method. Do not use a universal threshold without inspecting the actual scene.

Suggested baseline:
1. Load event backscatter and compatible pre-event baseline.
2. Derive candidate water pixels using calibrated VV threshold; optionally use VH and/or change features if supported by data.
3. Exclude permanent water using a dated reference layer where possible.
4. Apply conservative terrain/shadow and invalid-data masks where available.
5. Add confidence/uncertainty metadata. Urban areas, dense vegetation, layover/shadow and mixed pixels may reduce reliability.
6. Export:
   - `data/processed/flood_mask.tif`
   - `data/processed/flood_extent.geojson`
   - `data/processed/flood_metadata.json`

Do not claim the output is ground truth. If a threshold or mask is manually tuned, record the parameter and rationale.

## Phase 3 — Impact assessment

### Flooded area
- Calculate pixel area using a suitable projected/equal-area CRS or geodesic area method.
- Report hectares and square kilometres.
- Avoid calculating area directly from EPSG:4326 degree pixels.

### Settlements
- Use a sourced settlement/building layer (OSM or other verified source).
- Intersect with flood extent.
- Distinguish settlement features intersecting flood extent from entire settlement populations.

### Population
- Use a verified gridded population raster.
- Reproject/resample carefully; document method.
- Estimate exposure using fractional overlap where feasible:
  `estimated_exposed_population = Σ(population_cell × flooded_fraction_of_cell)`
- If fractional overlap is not implemented, disclose the simpler pixel inclusion method and its limitations.
- Do not label the result as confirmed affected people.

### Roads
- Intersect road geometries with flood polygons.
- Report affected segment length in km and number of segments.
- Preserve road class/name where available.
- Do not imply every intersecting segment is impassable.

### Facilities
- Extract hospitals, clinics, emergency services and shelters where verifiable.
- Identify facilities inside/near mapped flood extent.
- Include source and extraction date.

## Phase 4 — Candidate route analysis (only after core impact layers work)

- Build a road graph from the same documented OSM extract.
- Remove or heavily penalise road edges intersecting the mapped flood extent, with a configurable buffer and explicit assumptions.
- Use NetworkX shortest path (Dijkstra/A*) with length as the initial cost.
- Snap start/end points to the graph and validate snap distance.
- Return alternatives only if implemented and tested.
- Return a meaningful `no_route_found` response when disconnected.
- Do not route across missing road data or claim the result is safe/passable.

Every route response and frontend route panel must contain:
`Candidate route only. Road conditions and passability require ground verification by local authorities or response teams.`

## Backend technology

- Python 3.11+ (or environment-supported version).
- FastAPI + Uvicorn.
- Rasterio, NumPy, GeoPandas, Shapely, PyProj.
- Optional SciPy/OpenCV for raster filtering.
- OSMnx + NetworkX for route graph.
- Pydantic schemas.
- Pytest.
- GeoJSON for frontend vector layers; GeoTIFF/COG or raster tile service for rasters.

Avoid adding PostGIS, Celery, Redis, Kubernetes or other infrastructure unless genuinely needed. This is a single-event hackathon MVP.

## Required repository structure

```text
floodguard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── events.py
│   │   │   ├── flood.py
│   │   │   ├── impact.py
│   │   │   ├── routes.py
│   │   │   └── reports.py
│   │   ├── services/
│   │   │   ├── satellite.py
│   │   │   ├── preprocessing.py
│   │   │   ├── flood_detection.py
│   │   │   ├── water_mask.py
│   │   │   ├── impact.py
│   │   │   ├── routing.py
│   │   │   └── report.py
│   │   ├── schemas/
│   │   └── utils/
│   ├── tests/
│   └── requirements.txt
├── data/
│   ├── raw/{sentinel1,population,reference,osm}/
│   ├── processed/
│   └── metadata/
├── scripts/
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## API contract (minimum)

All endpoints should return consistent JSON errors and include metadata where relevant.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health/status and data readiness |
| GET | `/api/events` | Available demo events |
| GET | `/api/events/{event_id}` | Event metadata and AOI |
| GET | `/api/overview` | KPI summary and layer availability |
| GET | `/api/flood/extent` | Flood polygons as GeoJSON |
| GET | `/api/flood/metadata` | Acquisition dates, method, threshold and limitations |
| GET | `/api/impact` | Summary impact metrics |
| GET | `/api/impact/settlements` | Affected settlement features |
| GET | `/api/impact/roads` | Affected road segments |
| GET | `/api/facilities` | Facilities and exposure flags |
| POST | `/api/routes` | Candidate route request |
| GET | `/api/reports/{report_id}` | Evidence/report payload |

For raster delivery, choose one clear approach:
- Serve a static GeoTIFF/COG URL and use a frontend raster source that supports it; or
- Serve raster tiles through a lightweight tile endpoint.
Document the chosen approach. Do not pretend a GeoJSON endpoint is a raster endpoint.

### Example route request

```json
{
  "event_id": "kerala-2018-demo",
  "origin": {"longitude": 76.5, "latitude": 9.5},
  "destination": {"longitude": 76.6, "latitude": 9.6}
}
```

Coordinates above are illustrative schema examples only; do not use them as actual selected locations without verifying the AOI.

### Example route response fields

```json
{
  "status": "candidate_route",
  "distance_km": 0,
  "geometry": {"type": "LineString", "coordinates": []},
  "warnings": [
    "Candidate route only. Road conditions and passability require ground verification."
  ],
  "data_timestamp": "ISO-8601 timestamp",
  "method": "NetworkX shortest path over OSM road graph with mapped flood-intersecting edges excluded"
}
```

## Reliability requirements

- Empty datasets return an explicit empty collection and explanatory metadata.
- Missing files return a clear 503/404-style error, not a server crash.
- Invalid coordinates and unknown event IDs return 4xx errors.
- Repeated requests must be idempotent.
- Refreshing the frontend must not trigger destructive processing.
- Heavy geospatial processing should run as a script/job, not on every API read.
- No hidden network download during a user-facing API request.
- Never silently replace missing real data with hardcoded mock values.
- Add CORS configuration for the deployed frontend origin.
- Add `/docs` OpenAPI documentation.
- Add tests for no-data, invalid input, route-not-found and successful sample payloads.

## Completion gate before frontend begins

Frontend work starts only when:
- The backend runs locally from documented commands.
- `/api/health`, `/api/events`, `/api/overview` work.
- Flood GeoJSON can be loaded and displayed on a map.
- Impact API returns sourced metrics or explicit unavailable states.
- Facilities/roads endpoints return data or clear empty states.
- Route endpoint returns candidate route or a truthful no-route response.
- `docs/api_contract.md` and `docs/data_verification_log.md` are updated.
- A static demo snapshot is available for deployment fallback.

## Commands and deliverables

Provide:
- `requirements.txt` with pinned/compatible versions.
- `.env.example` with no secrets.
- `README.md` with setup, run, process-data and test commands.
- `docs/methodology.md`.
- `docs/dataset_catalogue.md`.
- `docs/data_verification_log.md`.
- `docs/api_contract.md`.
- A `scripts/prepare_demo.py` or equivalent to validate all required assets.
- Pytest suite and a concise test report.

At the end, report honestly:
1. What is implemented.
2. What data was actually downloaded and used.
3. What could not be verified.
4. What is mocked or static (if anything).
5. Known limitations and next steps.
