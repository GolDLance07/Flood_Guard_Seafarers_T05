import json
import numpy as np
import geopandas as gpd
from shapely.geometry import shape, box, LineString
from shapely.validation import explain_validity
import networkx as nx

print("=== 1. VERIFYING SENTINEL-1 SCENE METADATA & ORBIT COMPATIBILITY ===")
with open("data/processed/flood_metadata.json", "r") as f:
    meta = json.load(f)

event = meta["event_scene"]
base = meta["baseline_scene"]

print("Event Scene:", event["id"])
print("  Date:", event["date"], "| Pass:", event["pass"], "| Rel Orbit:", event["relative_orbit"], "| Pol:", event["polarisation"])
print("Baseline Scene:", base["id"])
print("  Date:", base["date"], "| Pass:", base["pass"], "| Rel Orbit:", base["relative_orbit"], "| Pol:", base["polarisation"])

from datetime import datetime
d_event = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
d_base = datetime.fromisoformat(base["date"].replace("Z", "+00:00"))
delta = d_event - d_base
print(f"Time Delta: {delta.days} days, {delta.seconds // 3600} hours (Sentinel-1 exact 12-day orbital repeat cycle)")
orbit_match = (event["relative_orbit"] == base["relative_orbit"] and event["pass"] == base["pass"] and event["polarisation"] == base["polarisation"])
print("Orbit / Geometry Compatibility:", "PERFECT MATCH" if orbit_match else "MISMATCH")


print("\n=== 2. VERIFYING KSDMA/NRSC FLOOD GEOJSON SOURCE & ATTRIBUTES ===")
raw_flood = gpd.read_file("data/raw/reference/alappuzha_flood_2018.geojson")
print(f"Raw clipped features: {len(raw_flood)}")
print("CRS:", raw_flood.crs)
print("Bounds:", raw_flood.total_bounds)
print("Sample Attributes:", raw_flood.iloc[0].drop("geometry").to_dict())
# Check validity
invalid_count = sum(~raw_flood.is_valid)
print(f"Invalid geometries in raw flood: {invalid_count}")


print("\n=== 3. INSPECTING PERMANENT WATER SUBTRACTION & VALIDITY ===")
proc_flood = gpd.read_file("data/processed/flood_extent.geojson")
print(f"Processed flood features: {len(proc_flood)}")
print("CRS:", proc_flood.crs)
invalid_proc = sum(~proc_flood.is_valid)
empty_proc = sum(proc_flood.is_empty)
print(f"Invalid geometries in processed flood: {invalid_proc}, Empty geometries: {empty_proc}")


print("\n=== 4. INDEPENDENTLY RECALCULATING FLOOD AREA ===")
# Reproject to UTM Zone 43N (EPSG:32643) for true projected planar area
proc_flood_utm = proc_flood.to_crs("EPSG:32643")
recalc_area_m2 = proc_flood_utm.geometry.area.sum()
recalc_area_ha = recalc_area_m2 / 10000.0
recalc_area_km2 = recalc_area_m2 / 1000000.0
print(f"Recalculated Area (EPSG:32643): {recalc_area_ha:.2f} ha ({recalc_area_km2:.2f} km²)")
stored_area_ha = meta["methodology"]["total_flooded_area_ha"]
stored_area_km2 = meta["methodology"]["total_flooded_area_km2"]
print(f"Stored Area in Metadata:       {stored_area_ha} ha ({stored_area_km2} km²)")
print(f"Difference: {abs(recalc_area_ha - stored_area_ha):.4f} ha ({(abs(recalc_area_ha - stored_area_ha)/recalc_area_ha)*100:.4f}%)")


print("\n=== 5. INSPECTING EXPOSED POPULATION CALCULATION ===")
with open("data/processed/overview.json", "r") as f:
    ov = json.load(f)
kpis = ov["kpis"]
exposed_pop = kpis["estimated_exposed_population"]
print(f"Exposed population: {exposed_pop:,}")
# Check density implied
implied_density = exposed_pop / recalc_area_km2
print(f"Implied exposed population density across {recalc_area_km2:.1f} km²: {implied_density:.1f} persons/km²")
print("District average density (Census 2011 for Alappuzha): ~1,504 persons/km²")
print(f"Ratio of exposed density to district average: {implied_density / 1504.0:.2f}")


print("\n=== 6. VERIFYING ROAD INTERSECTIONS & CHECKING DUPLICATES ===")
roads = gpd.read_file("data/processed/affected_roads.geojson")
print(f"Affected road features: {len(roads)}")
roads_utm = roads.to_crs("EPSG:32643")
recalc_road_len_km = roads_utm.geometry.length.sum() / 1000.0
stored_road_km = kpis["affected_roads_km"]
print(f"Total segment length of affected roads: {recalc_road_len_km:.2f} km")
print(f"Stored affected (intersecting) road length: {stored_road_km:.2f} km")
# Check duplicate osm_id
dup_count = roads["osm_id"].duplicated().sum()
print(f"Duplicate OSM IDs in affected roads: {dup_count}")


print("\n=== 7. INSPECTING 100x ROUTING PENALTY VS EXCLUSION & DISCONNECTED PATHS ===")
with open("data/processed/routing_graph.json", "r") as f:
    g_data = json.load(f)

G = nx.Graph()
for e in g_data["edges"]:
    u = tuple(e["u"])
    v = tuple(e["v"])
    dist = e["dist"]
    flooded = e["flooded"]
    weight = dist * (100.0 if flooded else 1.0)
    G.add_edge(u, v, distance=dist, weight=weight, flooded=flooded)

print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
flooded_edges = [d for _, _, d in G.edges(data=True) if d.get("flooded")]
print(f"Flooded edges in graph: {len(flooded_edges)} / {G.number_of_edges()} ({len(flooded_edges)/G.number_of_edges()*100:.1f}%)")

# Test what happens when flooded edges are strictly REMOVED vs 100x penalized
G_strictly_cut = G.copy()
edges_to_remove = [(u, v) for u, v, d in G_strictly_cut.edges(data=True) if d.get("flooded")]
G_strictly_cut.remove_edges_from(edges_to_remove)

print(f"Graph after cutting flooded edges: {G_strictly_cut.number_of_nodes()} nodes, {G_strictly_cut.number_of_edges()} edges")
components = list(nx.connected_components(G_strictly_cut))
print(f"Connected components after removing flooded edges: {len(components)}")
largest_cc = len(max(components, key=len))
print(f"Size of largest connected component: {largest_cc} nodes ({largest_cc/G.number_of_nodes()*100:.1f}%)")
