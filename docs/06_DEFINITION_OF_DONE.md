# FloodGuard — Definition of Done

## Data and evidence
- [ ] Selected event and compact AOI documented.
- [ ] Sentinel-1 event scene product ID and coverage verified.
- [ ] Compatible pre-event baseline product(s) verified.
- [ ] Actual download tested and source files retained.
- [ ] Preprocessing steps and parameters recorded.
- [ ] Reference flood extent date/coverage checked.
- [ ] Permanent-water treatment documented.
- [ ] Population raster year, resolution, units and licence verified.
- [ ] OSM extraction date and attribution recorded.
- [ ] All unverified items explicitly marked.

## Processing
- [ ] Flood mask generated from actual documented input.
- [ ] Flood polygons generated.
- [ ] Area calculated in valid projected/geodesic method.
- [ ] Settlements intersected.
- [ ] Population exposure estimated with disclosed method or marked unavailable.
- [ ] Affected road length calculated.
- [ ] Facilities mapped with source metadata.
- [ ] Uncertainty and limitations documented.
- [ ] No fabricated accuracy or validation metric.

## Backend
- [ ] Health endpoint.
- [ ] Event and overview endpoints.
- [ ] Flood extent and metadata endpoints.
- [ ] Impact, roads, settlements and facilities endpoints.
- [ ] Route endpoint returns candidate path or valid no-route state.
- [ ] Empty/error states tested.
- [ ] API contract and run instructions updated.
- [ ] Demo snapshot validator works.

## Frontend
- [ ] Map-first command centre.
- [ ] Real API integration.
- [ ] KPI units and provenance visible.
- [ ] Layer toggles and feature inspection.
- [ ] Rescue workflow and route warning.
- [ ] Data & Evidence panel.
- [ ] No silent mock fallback.
- [ ] Loading, empty, partial and error states.
- [ ] Refresh and repeated actions tested.
- [ ] Responsive layout and no excessive scroll.

## Demo and deployment
- [ ] Backend deployed and health check passes.
- [ ] Frontend deployed and connected.
- [ ] Demo does not depend on live satellite download.
- [ ] Source attribution visible.
- [ ] 90-second demo rehearsed.
- [ ] Backup screenshots/video or local run path prepared.
- [ ] All claims in pitch match implemented evidence.
