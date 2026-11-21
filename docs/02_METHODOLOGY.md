# FloodGuard — Technical Methodology

## 1. Objective

Produce a transparent historical flood-impact assessment for one compact area of interest (AOI), using satellite radar observations and supporting geospatial layers. The output is decision-support information, not an official emergency map.

## 2. Observation strategy

### Primary observation
Sentinel-1 SAR is the preferred sensor because radar observations can be acquired through cloud cover and are useful during monsoon conditions.

### Event selection
The initial research candidate is Kerala, August 2018, with an event acquisition around 21 August 2018. This date is a candidate only. The team must verify exact scene coverage, acquisition geometry, product availability and reference-layer date before committing.

### Baseline selection
Choose pre-event observations that match the event image as closely as possible:
- same relative orbit where feasible;
- same orbit direction;
- compatible polarisation;
- similar incidence-angle range;
- complete AOI coverage;
- compatible product type and preprocessing.

Do not compare arbitrary scenes and interpret all backscatter differences as flooding.

## 3. Preprocessing

For Sentinel-1 GRD, select a documented workflow that may include orbit correction, thermal-noise removal, radiometric calibration, speckle filtering, terrain correction and geocoding. Exact steps depend on product and processing tool.

Pre-event and event rasters must be aligned to the same CRS, pixel grid, resolution, extent and nodata convention before pixelwise comparison.

If an analysis-ready RTC product is used instead, document its provider, processing level, units, resolution and known limitations. Do not mix GRD and RTC inputs without a justified conversion/workflow.

## 4. Flood classification concept

A simple explainable baseline is preferred over an unvalidated complex model.

1. Identify candidate water pixels from event backscatter using a threshold calibrated to the actual scene.
2. Optionally use pre-event/event change information and a second polarisation if data quality supports it.
3. Remove permanent water using a dated water-occurrence/reference layer where available.
4. Apply masks for invalid pixels and obvious terrain/shadow artefacts where feasible.
5. Generate a confidence or uncertainty indicator.

Conceptual expression:

`candidate_flood = event_water_candidate AND NOT permanent_water`

This is a conceptual starting point, not a complete scientific algorithm. Thresholds, filters and masks must be documented and inspected against reference evidence.

## 5. Known detection limitations

- Urban built-up areas can create radar scattering patterns that complicate water detection.
- Dense vegetation can obscure floodwater.
- Layover, shadow, steep terrain and mixed pixels can cause errors.
- A permanent-water layer may be outdated or incomplete.
- A reference map may represent a different acquisition date or mapping definition.
- A threshold tuned to one scene should not be described as universal.
- Flood extent is not the same as flood depth, velocity or hazard severity.

## 6. Area calculation

Calculate flood area using a suitable projected CRS or geodesic area method. Do not sum square degrees in EPSG:4326.

Report:
- area in hectares;
- area in square kilometres;
- pixel size and calculation method;
- date of the source imagery;
- any excluded classes/masks.

## 7. Exposure estimation

### Population
For a gridded population dataset, estimate exposed population by overlaying the flood footprint with population cells. A fractional-cell approach is preferable:

`P_exposed = Σ(P_i × F_i)`

where `P_i` is population in cell i and `F_i` is the fraction of that cell covered by mapped flood extent.

If only a binary cell inclusion method is feasible, state that limitation. Report population year, resolution, raster units, resampling method and uncertainty.

### Settlements
Count or list settlement/building features intersecting the mapped flood footprint. State the feature definition and source. Do not assume an intersecting building polygon means occupants were present or affected.

### Roads
Intersect road geometries with the flood footprint. Report affected segment count and length. An intersecting segment is a mapped exposure indicator, not a confirmed closure.

### Facilities
Map hospitals, clinics, emergency services and shelters if available. Report whether each point is inside or near the mapped flood footprint. Do not infer operational status from map location.

## 8. Candidate routing

Build a graph from a documented road-network extract. Exclude or penalise road edges intersecting mapped flood extent. Compute a shortest path over the remaining graph.

This method is a simplified planning aid. OSM completeness, road classification, flood-mask accuracy, road condition, bridge status and current closures may be unknown.

Required disclaimer:

> Candidate route only. Road conditions and passability require ground verification by local authorities or response teams.

If the graph is disconnected or no valid path exists, return `no_route_found`. Never fabricate an alternative.

## 9. Validation and evidence

Where a reference flood map exists:
- verify it covers the same AOI;
- verify acquisition/mapping date;
- align CRS and resolution;
- compare spatial overlap;
- report intersection-over-union (IoU) only if the reference is suitable and the comparison is meaningful;
- explain differences in mapping date, sensor, resolution and class definition.

Do not invent accuracy, precision, recall or IoU values. If no suitable reference is available, say validation was qualitative or not completed.

## 10. Output metadata

Every generated layer should include or accompany:
- source dataset and exact product identifier;
- acquisition date;
- processing date;
- CRS and resolution;
- method and parameter values;
- nodata handling;
- software/tool versions;
- known limitations;
- whether it is observed, derived, reference, contextual or illustrative.
