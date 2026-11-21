# Antigravity Frontend Handoff — FloodGuard

## Start condition

Do not start frontend integration until the backend team provides:
- running API base URL;
- `docs/api_contract.md`;
- one real flood GeoJSON layer or an explicitly labelled demo snapshot;
- overview/impact payload examples;
- layer availability metadata;
- CORS configuration.

If these are not ready, build the shell using the API contract and typed sample fixtures clearly marked as development fixtures. Replace them with live API data before final demo.

## Product goal

Build a map-first disaster intelligence dashboard that a judge can understand in under 30 seconds. The interface should feel like a focused operational tool, not a long analytics landing page.

## Information architecture

### 1. Command Center (default)
- Full-height interactive map as the dominant surface.
- Header: FloodGuard, selected event and AOI, data timestamp/status.
- Compact KPI strip: mapped flood area, estimated exposed population, affected road length, affected facilities/settlements.
- Layer controls: flood extent, settlements, population (if supported), roads, facilities, reference layer.
- Small side panel for event summary and data-confidence/limitations.
- Fit-to-AOI and reset-view controls.

### 2. Impact Assessment
- Compact tabs or drawer, not a long page.
- Population exposure with year, resolution and estimation method.
- Settlements intersecting flood extent.
- Affected road segments and total mapped length.
- Facilities inside/near mapped extent.
- Every unavailable metric gets an explicit unavailable state.

### 3. Rescue Intelligence
- Origin and destination selection on map or validated coordinate input.
- Call `POST /api/routes`.
- Show route geometry, distance and method.
- Show no-route state if no path exists.
- Prominent persistent warning:
  **Candidate route only — verify road conditions and passability with local authorities or ground teams.**
- Never call the route safe, verified or guaranteed.

### 4. Data & Evidence
- Satellite acquisition dates and scene/product identifiers.
- Data sources and dates for population, roads, facilities, reference maps.
- Processing method and key parameters.
- Validation status and known uncertainty.
- Clear distinction between observed, derived, contextual and demo data.

## Visual design

- Dark navy / charcoal canvas.
- Flood extent: cyan/blue.
- Affected infrastructure: red/orange.
- Uncertainty: amber.
- Neutral roads and boundaries.
- Translucent compact panels with restrained blur, subtle geometric background pattern.
- High-contrast labels and readable map legend.
- Avoid excessive gradients, decorative clutter and oversized cards.
- Desktop-first operational layout, responsive on smaller screens.
- Avoid long vertical scrolling; use drawers, tabs and collapsible panels.

## Technical expectations

- React + TypeScript + Vite.
- MapLibre GL JS for map rendering.
- Tailwind CSS and shadcn/ui (or existing project design system).
- Recharts only for charts that add real value.
- API base URL from environment variable (e.g. `VITE_API_BASE_URL`).
- Strong TypeScript types for all API responses.
- Keep map source/layer management isolated in reusable components.
- Do not hardcode metrics, event geometry or source dates in production components.
- Use backend-provided metadata for labels and units.
- Add attribution for basemap and OSM-derived data.

## Required states and behaviour

- Loading state for each data request.
- Empty state for valid empty FeatureCollections.
- Partial state when some layers are available and others are not.
- API unavailable state with retry.
- Unknown event and out-of-AOI route input validation.
- Repeated button clicks must not create duplicate requests or corrupt state.
- Refresh must restore selected event/layers safely.
- Layer toggles must be reversible.
- Map must fit the selected AOI on first load.
- No hidden mock fallback. If fixtures are used during development, make them visibly labelled and remove/disable them for the final live-data demo.

## Acceptance checklist

- A first-time user can identify the event and flood layer without a walkthrough.
- Main dashboard fits a standard laptop viewport without excessive scrolling.
- Flood GeoJSON renders correctly and is distinguishable from other layers.
- KPIs show correct units and provenance.
- Clicking a settlement/road/facility reveals useful attributes.
- Route flow returns candidate route or a useful no-route state.
- Route warning is visible.
- Data & Evidence exposes acquisition dates, sources, method and limitations.
- No hardcoded production values.
- API errors and missing data do not break the map.
- Refresh, repeated clicks and changing layers do not break the app.
