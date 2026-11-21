# Master Prompt for Antigravity — FloodGuard Frontend

Build the frontend for FloodGuard using the backend already implemented in this repository.

Before changing code, inspect:
- `README.md`
- `docs/03_API_CONTRACT.md`
- `docs/05_FRONTEND_HANDOFF_ANTIGRAVITY.md`
- the actual backend routes and response schemas
- the real processed data metadata

Do not guess endpoint paths or response fields. If the running backend differs from the API contract, identify the discrepancy and align with the actual implementation deliberately.

## Goal

Create a polished, map-first disaster intelligence command centre. A judge should understand the event, mapped flood extent, estimated exposure and candidate route workflow within 30 seconds.

## Stack

Use the existing repository stack if already established. Otherwise use React, TypeScript, Vite, Tailwind, shadcn/ui and MapLibre GL JS. Avoid unnecessary dependencies.

## Layout

- One primary dashboard viewport.
- Full-height map as the main surface.
- Compact header with event/AOI and data status.
- Compact KPI strip with units.
- Right/left drawer or tabbed panel for impact, rescue intelligence and evidence.
- Dark navy/charcoal theme with cyan flood, amber uncertainty and red/orange affected infrastructure.
- Restrained geometric background and translucent panels.
- No giant landing-page hero, no excessive scroll, no decorative clutter.

## Data integration

- All production metrics and map geometry must come from the backend.
- Use environment variable for API base URL.
- Strongly type API responses.
- Handle loading, empty, partial, unavailable and error states.
- Do not hardcode event numbers, population estimates, dates, coordinates or layer geometries.
- Do not silently use mock data if the API fails.
- If a development fixture is essential, label it visibly and ensure production/demo mode does not silently fall back to it.
- Respect backend CRS and convert only where required by the map library.
- Include map/OSM attribution.

## Map interactions

- Toggle flood extent, roads, settlements, facilities and optional population layer.
- Fit map to AOI on initial load.
- Reset view.
- Click features for a compact details panel.
- Display confidence/uncertainty where supplied by backend.
- Ensure layer order and opacity preserve readability.

## Rescue Intelligence

- Let the user choose origin and destination on the map or enter coordinates.
- Validate coordinates and AOI bounds.
- Call the real route endpoint.
- Render returned route geometry and distance.
- Render a useful no-route state.
- Always display:
  “Candidate route only — verify road conditions and passability with local authorities or ground teams.”
- Never imply the route is safe or currently passable.

## QA before finishing

Test:
1. Initial load.
2. API unavailable.
3. One layer unavailable while others work.
4. Empty FeatureCollection.
5. Invalid/out-of-bounds route input.
6. No route found.
7. Repeated route submission.
8. Refresh.
9. Rapid layer toggles.
10. Narrow viewport.

Fix layout overflow, console errors, loading hangs, broken map sizing and duplicate requests.

## Final deliverables

- Working frontend connected to the real backend.
- `.env.example`.
- Updated README with frontend run instructions.
- Screenshots or concise visual QA notes.
- List of endpoints consumed.
- List of any remaining mock/static elements.
- Known limitations and exact steps to run the full app.
