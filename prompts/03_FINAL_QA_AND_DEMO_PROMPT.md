# Antigravity Final QA & Demo Readiness Prompt — FloodGuard

Audit the entire FloodGuard application as a skeptical hackathon judge. Do not merely describe issues; fix the issues that can safely be fixed within scope.

## Reliability
- Empty data must not crash the app.
- Missing files and failed API requests must produce useful states.
- Refresh must restore the dashboard without triggering destructive jobs.
- Repeated actions must not duplicate or corrupt state.
- Route submission must prevent invalid coordinates and duplicate in-flight requests.
- No loading spinner may hang indefinitely; provide retry/timeout handling.
- No console errors, broken imports or unresolved environment variables.

## Data integrity
- Search the codebase for hardcoded impact figures, coordinates, event dates and source claims.
- Verify that displayed production values originate from API responses or documented static assets.
- Ensure any static demo snapshot is visibly labelled and traceable.
- Confirm that units and data dates are visible.
- Check that null/unavailable metrics are not displayed as zero.
- Confirm that no unverified source or validation score is presented as fact.

## Geospatial correctness
- Confirm flood GeoJSON draws in the correct location.
- Confirm coordinate order and CRS.
- Confirm map fits the selected AOI.
- Confirm route geometry and flood/road layers align.
- Confirm area units and route distance units.
- Confirm affected roads are exposure indicators, not asserted closures.

## UX
- Main journey should be understandable without narration.
- Keep the map dominant and reduce vertical scrolling.
- Ensure all controls have labels and clear active states.
- Make layer toggles reversible.
- Ensure selected features have clear details.
- Maintain readable contrast and responsive behaviour.
- Route warning must be prominent.

## Security and deployment
- No secrets committed.
- CORS allows only required frontend origins in deployment.
- API base URL is configurable.
- Health endpoint works on deployed backend.
- Frontend works against deployed API.
- No local-only paths are required at runtime.
- Provide a demo fallback that does not misrepresent data.

## Demo narrative (90 seconds)
1. Select Kerala 2018 event and show the AOI.
2. Toggle the satellite-derived flood extent.
3. Explain the SAR before/event comparison and permanent-water treatment.
4. Show mapped flood area and estimated exposure with source/year.
5. Toggle affected roads and facilities.
6. Select origin/destination and show candidate route or no-route state.
7. State that routes require ground verification and that this is a historical decision-support prototype.

At the end, produce a pass/fail checklist and list unresolved risks. Do not mark a check as passed unless it was actually tested.
