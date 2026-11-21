import requests
import json
import geopandas as gpd

AOI_BBOX = [76.30, 9.30, 76.60, 9.60] # minx, miny, maxx, maxy

# 1. Download and filter Alappuzha flood polygon
print("1. Processing Flood Inundation Layer...")
url_flood = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_flood_pain_2018/geojson/ALPZA_FD.geojson"
gdf_flood = gpd.read_file(url_flood)
print("Raw flood features:", len(gdf_flood))
# Clip to AOI
from shapely.geometry import box
aoi_geom = box(*AOI_BBOX)
gdf_flood_aoi = gdf_flood.clip(aoi_geom)
print("Clipped flood features in AOI:", len(gdf_flood_aoi))
gdf_flood_aoi.to_file("data/raw/reference/alappuzha_flood_2018.geojson", driver="GeoJSON")

# 2. Check Roads
print("\n2. Processing State and National Highways...")
url_sh = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_Roads/kpwd.gis-pwdroads-sh.geojson"
url_nh = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_Roads/kpwd.gis-pwdroads-nh.geojson"

gdf_sh = gpd.read_file(url_sh).clip(aoi_geom)
gdf_nh = gpd.read_file(url_nh).clip(aoi_geom)
print(f"Roads in AOI: State Highways={len(gdf_sh)}, National Highways={len(gdf_nh)}")

import pandas as pd
gdf_roads = pd.concat([gdf_nh, gdf_sh], ignore_index=True)
gdf_roads.to_file("data/raw/osm/alappuzha_roads.geojson", driver="GeoJSON")

# 3. Check Waterbodies (Permanent Water)
print("\n3. Processing Permanent Waterbodies...")
url_water = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_Environment/kpwd.gis-waterbodies.geojson"
gdf_water = gpd.read_file(url_water).clip(aoi_geom)
print(f"Permanent waterbodies in AOI: {len(gdf_water)}")
gdf_water.to_file("data/raw/reference/alappuzha_permanent_water.geojson", driver="GeoJSON")

print("\nSaved raw reference layers to data/raw/!")
