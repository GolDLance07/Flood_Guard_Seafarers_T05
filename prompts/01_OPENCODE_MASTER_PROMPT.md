# Master Prompt for OpenCode — Build FloodGuard Backend First

You are the senior geospatial/backend engineer for a 12-hour, 2-person hackathon project named FloodGuard.

Read these files before coding:
- `README.md`
- `docs/01_BACKEND_HANDOFF_OPENCODE.md`
- `docs/02_METHODOLOGY.md`
- `docs/03_API_CONTRACT.md`
- `docs/04_DATASET_CATALOGUE_AND_VERIFICATION_LINKS.md`

## Non-negotiable instruction

**Verify the data links and actual dataset availability first.** The links in the catalogue are candidate research entry points only. Open each relevant source, inspect current documentation/catalogues, identify exact product records, confirm AOI coverage and access requirements, and attempt a small real download before building the processing pipeline. Record evidence in `docs/data_verification_log.md`.

Do not claim a dataset, product ID, acquisition date, API endpoint, scene footprint, metric or validation result is verified unless you actually checked it. Do not invent links or use placeholder metrics in the final app.

## Execution sequence

1. Inspect the repository and existing code. Preserve useful work; do not blindly overwrite.
2. Create a concise task plan and identify environment/data-access blockers.
3. Verify Sentinel-1 event and baseline scene coverage for the compact Kerala 2018 AOI.
4. Verify official/reference flood layer, permanent-water option, population raster, OSM roads and facilities.
5. Select the smallest viable AOI and write down why it was selected.
6. Download and preprocess data. Save raw data separately from processed outputs.
7. Generate and inspect the flood mask; record thresholds and limitations.
8. Generate flood polygons and calculate area correctly.
9. Add population/settlement exposure if inputs are verified.
10. Add road impact and facilities.
11. Implement candidate routing only if the graph and flood layer are sufficiently complete.
12. Implement FastAPI endpoints exactly as described in the API contract.
13. Add tests, error handling, metadata and run instructions.
14. Prepare a static demo snapshot and validate all assets.
15. Update documentation and report what is truly implemented.

## Engineering rules

- Keep the MVP small and robust.
- Use Python + FastAPI and geospatial libraries appropriate to the environment.
- Prefer reproducible scripts over manual one-off steps.
- Do not download large datasets unnecessarily; clip to AOI where possible.
- Do not run heavy processing on API reads.
- Do not use arbitrary SAR thresholds without scene inspection and documentation.
- Do not calculate area in geographic degrees.
- Do not label estimated population as confirmed affected people.
- Do not label a route as safe or passable.
- Return explicit empty/unavailable states.
- Do not silently fall back to fake data.
- Add tests for missing data, invalid input, no route and successful output.
- Keep secrets out of source control.

## Timebox

The backend phase is approximately 5 hours. If a required external dataset cannot be verified/downloaded quickly, document the blocker and use only a defensible, clearly labelled fallback. Do not burn the entire hackathon attempting an inaccessible data portal.

## Final response required

At completion, provide:
- repository tree;
- exact setup/run/test commands;
- API endpoint list and example payloads;
- actual data sources, product IDs, dates, AOI and download status;
- processing method and parameter values;
- generated output paths;
- tests run and results;
- known limitations;
- unverified links/data and recommended fallback;
- explicit list of anything mocked, static or illustrative.

Do not say “complete” if any acceptance gate remains unmet.
