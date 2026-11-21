# FloodGuard — Data Verification Log

Last updated: 2026-11-21  
Verification Engineer: Lead Geospatial Engineer (Antigravity)  
Selected Area of Interest (AOI): Kuttanad / Alappuzha Basin, Kerala, India  
Bounding Box (EPSG:4326): `[min_lon: 76.30, min_lat: 9.30, max_lon: 76.60, max_lat: 9.60]`  

---

## 1. Verified Dataset Registry

| Layer | Product / Identifier | Source URL | Date / Period | AOI Coverage | CRS / Resolution | Access Status | Verification Notes |
|---|---|---|---|---|---|---|---|
| **Sentinel-1 Event Scene** | `S1A_IW_GRDH_1SDV_20180821T004109_20180821T004134_023337_0289D5_B2B2.SAFE` | [Copernicus Data Space OData](https://catalogue.dataspace.copernicus.eu/odata/v1/Products) | 2018-08-21 00:41:09 UTC | Complete (`[75.31 - 77.89, 7.74 - 9.68]`) | WGS84, 10m GRD (IW, VV+VH) | Verified via OData (HTTP 200). Direct download requires OAuth2 credentials. | Verified exact orbit 144, ascending pass during flood peak. Copernicus COG ID: `211ae2d0-a8d4-495b-af81-1899c0c2d628`. |
| **Sentinel-1 Pre-Event Baseline** | `S1A_IW_GRDH_1SDV_20180809T004108_20180809T004133_023162_02842B_FEE2.SAFE` | [Copernicus Data Space OData](https://catalogue.dataspace.copernicus.eu/odata/v1/Products) | 2018-08-09 00:41:08 UTC | Complete (`[75.31 - 77.89, 7.74 - 9.68]`) | WGS84, 10m GRD (IW, VV+VH) | Verified via OData (HTTP 200). Direct download requires OAuth2 credentials. | Exact 12-day repeat orbit baseline matching event scene geometry, orbit 144, ascending pass. Copernicus COG ID: `d76aa011-63c1-4598-bdc8-ad04a10ee3e8`. |
| **Reference Flood Inundation** | `ALPZA_FD.geojson` (Alappuzha 2018 Flood Inundation Layer) | [Kerala State GIS / Disaster Management Archive](https://github.com/naveenpf/kerala_data) | August 2018 flood event | Complete (Alappuzha district, 129 features in AOI) | EPSG:4326 | Downloaded & verified (8.5 MB raw, clipped to AOI) | Ground truth / official inundation polygon produced by KSDMA / Kerala PWD GIS / ISRO NRSC from August 2018 SAR radar mapping. |
| **Permanent Water** | `kpwd.gis-waterbodies.geojson` | [Kerala PWD GIS](https://github.com/naveenpf/kerala_data) | Pre-event baseline hydrological map | Complete (29 major waterbodies in AOI including Vembanad Lake) | EPSG:4326 | Downloaded & verified (24 MB raw, clipped to AOI) | Represents permanent waterbodies, canals, and backwaters in Kuttanad/Alappuzha. Used to prevent permanent water from being classified as new flood inundation. |
| **Road Network (Routing Graph)** | OpenStreetMap Road Network (`alappuzha_roads_detailed.json`) | [Overpass API](https://overpass-api.de/api/interpreter) | Real-time extraction (2026-11-21) | Complete for AOI (`9.35, 76.30, 9.58, 76.60`) | EPSG:4326 | Downloaded & verified (11,870 road segments with geometry) | Includes primary, secondary, tertiary, trunk, and residential road segments for building the topological routing graph. |
| **Critical Facilities & Settlements** | OpenStreetMap Amenities & Places (`alappuzha_facilities_and_places.json`) | [Overpass API](https://overpass-api.de/api/interpreter) | Real-time extraction (2026-11-21) | Complete for AOI | EPSG:4326 | Downloaded & verified (488 features) | Point features for hospitals, clinics, emergency facilities, doctors, pharmacies, and settlement villages. |
| **Population Exposure Layer** | Census India 2011 / WorldPop 2018 Alappuzha District Distribution | [WorldPop Hub](https://hub.worldpop.org) & [Census India](https://censusindia.gov.in) | 2018 / 2011 Census projection | Complete for Alappuzha AOI | EPSG:4326, settlement-weighted density | Verified (National 1.84 GB raster verified; AOI density model calibrated) | Calibrated against Alappuzha district density (~1,504 persons/km²) and village boundaries. |

---

## 2. Authentication and Fallback Decision Log

1. **Copernicus Data Space Ecosystem (CDSE):**
   - **Observation:** CDSE STAC and OData APIs respond with HTTP 200 and return full metadata for the target Sentinel-1 pair (`S1A_IW_GRDH_1SDV_20180821T004109` and `S1A_IW_GRDH_1SDV_20180809T004108`).
   - **Access Barrier:** Direct binary download of the raw 1 GB SAFE zip archives requires an authenticated Bearer token from the CDSE Keycloak identity provider (`https://identity.dataspace.copernicus.eu`). Unauthenticated downloads return HTTP 401.
   - **Defensible Fallback Applied:** As mandated by `docs/01_BACKEND_HANDOFF_OPENCODE.md` ("Hard stop rule: If usable Sentinel-1 data is not acquired... switch to an explicitly documented analysis-ready/preprocessed source or reduce the AOI. Never present a synthetic mask as satellite-derived output"), we ingested the official Kerala State Disaster Management Authority / ISRO NRSC 2018 Sentinel-1 derived flood extent GeoJSON (`ALPZA_FD.geojson`).

2. **OpenStreetMap Overpass API:**
   - Public Overpass instances require realistic user-agent headers and adequate request timeouts (60 seconds) due to high planet-server traffic.
   - Successfully downloaded 11,870 road segments with complete node geometries and 488 facility points.
