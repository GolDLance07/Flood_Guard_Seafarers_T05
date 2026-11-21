# FloodGuard — Dataset Catalogue & Verification Links

**Important:** These are research entry points and candidate sources, not a statement that the exact dataset, scene, date, AOI coverage or download endpoint has already been verified. OpenCode must open the links, inspect the current documentation/catalogue, verify access and record the result in `docs/data_verification_log.md`.

## A. Sentinel-1 SAR — primary flood observation

### Candidate source
- Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/
- Copernicus Data Space STAC documentation: https://documentation.dataspace.copernicus.eu/APIs/STAC.html
- Sentinel-1 mission information: https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1

### What OpenCode must verify
- Search Sentinel-1 GRD products over the candidate Alappuzha/Kottayam AOI around 21 August 2018.
- Confirm exact product IDs and coverage.
- Identify compatible pre-event products; compare orbit direction, relative orbit, polarisation and incidence-angle characteristics.
- Confirm product level, pixel spacing/resolution, acquisition time, footprint and download access.
- Verify whether authentication/account setup is required and test an actual download.
- If exact 21 August data is unavailable for the chosen AOI, inspect nearby event dates and explain the choice.
- Do not invent product IDs or state that a scene is available without a catalogue result.

### Relevant historical evidence to inspect
- NRSC/ISRO Kerala flood mapping material: https://www.nrsc.gov.in/
- Bhuvan portal: https://bhuvan.nrsc.gov.in/
- Kerala State Disaster Management Authority: https://sdma.kerala.gov.in/

Search for official Sentinel-1 flood maps for Kerala in July/August 2018. Confirm each map's date and geographic coverage. Do not compare a July 16 reference map as if it were an August 21 reference map.

## B. Population — exposure estimate

### Candidate source
- WorldPop: https://www.worldpop.org/
- WorldPop data portal: https://hub.worldpop.org/
- WorldPop API documentation: https://www.worldpop.org/sdi/introapi/

### What OpenCode must verify
- Select a population raster with coverage for the AOI.
- Record year, spatial resolution, units (e.g. people per pixel), projection, licence and exact download URL.
- Confirm whether the selected product is constrained/unconstrained and what that means.
- Confirm whether the raster is a count-per-cell or density surface before calculating exposure.
- Prefer a suitable recent historical year, but do not imply it represents the exact 2018 event population unless supported.
- Record resampling and fractional-overlap method.

## C. Roads, settlements and facilities — contextual layers

### Candidate sources
- OpenStreetMap: https://www.openstreetmap.org/
- Geofabrik downloads: https://download.geofabrik.de/asia/india.html
- Overpass API: https://overpass-api.de/
- OSM Wiki — map features: https://wiki.openstreetmap.org/wiki/Map_features

### What OpenCode must verify
- Extract only the selected AOI plus a small routing buffer.
- Record extraction date, query/provider, licence/attribution and file format.
- Verify the presence and completeness of roads, buildings/settlements, hospitals, clinics and shelters.
- Do not assume all facilities are mapped or operational.
- Keep OSM attribution in the app and report.

## D. Permanent water / reference flood extent

### Candidate sources
- Bhuvan/NRSC: https://bhuvan.nrsc.gov.in/
- NRSC: https://www.nrsc.gov.in/
- JRC Global Surface Water: https://global-surface-water.appspot.com/
- JRC Global Surface Water data: https://global-surface-water.appspot.com/download

### What OpenCode must verify
- Confirm whether a permanent-water layer can be downloaded for the AOI and which time period it represents.
- Confirm official flood reference extent date, event date, coverage and download format.
- A reference map from another date is not direct ground truth for the selected satellite acquisition.
- If a reliable permanent-water mask is unavailable, disclose the limitation and avoid claiming that all permanent water was removed.

## E. Optional elevation / terrain context

### Candidate sources
- NASA Earthdata: https://www.earthdata.nasa.gov/
- Copernicus DEM: https://dataspace.copernicus.eu/
- USGS EarthExplorer: https://earthexplorer.usgs.gov/

### What OpenCode must verify
- Coverage, resolution, vertical datum, licence/access and download requirements.
- Use only if terrain/shadow filtering or contextual visualisation can be completed within the timebox.
- DEM-derived flow or flood modelling is out of scope for the core MVP.

## F. Optional rainfall context

### Candidate sources
- NASA GPM: https://gpm.nasa.gov/data
- MOSDAC: https://mosdac.gov.in/

### What OpenCode must verify
- Historical time coverage, temporal resolution, spatial resolution, units, access and AOI coverage.
- Rainfall can provide context; it does not replace satellite flood mapping or validate flood extent by itself.

## G. Required verification log format

Create `docs/data_verification_log.md` with one row per actual dataset:

| Layer | Product/ID | Exact URL | Date/year | AOI covered? | CRS/resolution | Access tested? | Downloaded? | Licence | Decision/notes |
|---|---|---|---|---|---|---|---|---|---|

Use only verified values. Write `NOT VERIFIED` when unknown. Include exact product IDs and checksums after download.

## H. Fallback policy

If the initial Sentinel-1 acquisition cannot be downloaded:
1. Try another compatible acquisition date within the same Kerala 2018 event.
2. Reduce the AOI to fit a confirmed scene footprint.
3. Use a documented analysis-ready Sentinel-1 product if accessible.
4. If none is available in the timebox, stop and report the blocker. Do not substitute an unrelated flood mask while describing it as the chosen event's Sentinel-1 result.

If population or facility data is unavailable, keep the corresponding metric unavailable and explain why. A truthful partial MVP is better than a polished work of fiction.
