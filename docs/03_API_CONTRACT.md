# FloodGuard API Contract — Version A

Base path: `/api`  
Format: JSON unless an endpoint explicitly serves GeoJSON, raster data or a file.  
Coordinates in API GeoJSON: EPSG:4326 longitude/latitude order.

## Common response principles

- Include `event_id` and `generated_at` where relevant.
- Include source/method metadata for derived outputs.
- Use explicit `available`, `partial`, `unavailable` or `empty` status values.
- Do not return fabricated defaults for missing data.
- Use consistent error shape:
```json
{
  "error": {
    "code": "DATA_NOT_AVAILABLE",
    "message": "Flood extent has not been generated for this event.",
    "details": {}
  }
}
```

## Endpoints

### `GET /api/health`
Returns service status and data readiness.

Suggested fields: `status`, `version`, `data_ready`, `available_layers`, `missing_layers`.

### `GET /api/events`
Returns available event records. Each event includes `id`, `name`, `event_date`, `region`, `aoi`, `status`.

### `GET /api/events/{event_id}`
Returns event metadata, AOI geometry/bounds, acquisition metadata, and available layers.

### `GET /api/overview?event_id={id}`
Returns headline metrics and layer readiness:
- flooded area (ha and km²);
- estimated exposed population (with year/resolution/method);
- affected road length (km);
- affected settlement count;
- facility counts by category;
- per-metric `status`, `source` and `method`.

If a metric cannot be calculated, return null with `status: unavailable`, not zero.

### `GET /api/flood/extent?event_id={id}`
Returns a GeoJSON FeatureCollection. Properties should include `class`, `confidence` if available, `source_date`, `method`, and `area_ha` where calculated.

### `GET /api/flood/metadata?event_id={id}`
Returns pre/event scene identifiers, dates, orbit/polarisation details, preprocessing, threshold/parameters, permanent-water treatment, validation and limitations.

### `GET /api/impact?event_id={id}`
Returns combined impact summary with units and source metadata.

### `GET /api/impact/settlements?event_id={id}`
Returns settlement features intersecting the flood extent. Empty FeatureCollection is valid.

### `GET /api/impact/roads?event_id={id}`
Returns road segments intersecting the flood extent. Include road class/name, affected length and exposure basis where available.

### `GET /api/facilities?event_id={id}`
Returns facility points and categories. Include `inside_flood_extent` and/or distance-to-flood only if actually calculated.

### `POST /api/routes`
Request:
```json
{
  "event_id": "kerala-2018-demo",
  "origin": {"longitude": 0.0, "latitude": 0.0},
  "destination": {"longitude": 0.0, "latitude": 0.0}
}
```
Coordinates are schema placeholders. Frontend must constrain inputs to the selected AOI or provide a clear out-of-bounds response.

Success response:
```json
{
  "status": "candidate_route",
  "distance_km": 0.0,
  "geometry": {"type": "LineString", "coordinates": []},
  "method": "documented road graph shortest path",
  "warnings": [
    "Candidate route only. Road conditions and passability require ground verification."
  ]
}
```
No route:
```json
{
  "status": "no_route_found",
  "distance_km": null,
  "geometry": null,
  "warnings": [
    "No route was found in the available road graph after mapped flood-exposed edges were excluded."
  ]
}
```

### `GET /api/reports/{report_id}`
Returns a report payload with event, data sources, methods, metrics, limitations and generated layer references.

## HTTP status guidance

- `200`: request succeeded, including a valid empty FeatureCollection.
- `400`: malformed input or invalid coordinates.
- `404`: unknown event/report identifier.
- `422`: schema validation failure.
- `503`: required processing output or dataset unavailable.
- `500`: unexpected server error; return a non-sensitive message and log details server-side.

## Frontend integration requirements

- Configure API base URL via environment variable.
- Handle loading, empty, partial and error states.
- Refreshing a page must not launch processing or downloads.
- Cache stable event metadata and static layers appropriately.
- Do not treat null metrics as zero.
- Show the route warning in the route panel, not buried in documentation.
