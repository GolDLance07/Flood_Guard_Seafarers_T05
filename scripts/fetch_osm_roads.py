import requests
import json

url = 'https://overpass-api.de/api/interpreter'
# Fetch highways in the AOI with full geometry
query = """[out:json][timeout:60];
(
  way["highway"~"primary|secondary|tertiary|trunk|residential"](9.35,76.30,9.58,76.60);
);
out geom;
"""
headers = {'User-Agent': 'FloodGuardApp/1.0 (dev@floodguard.io)'}
try:
    print("Fetching OSM road network with geometry (timeout=60s)...")
    r = requests.post(url, data={'data': query}, headers=headers, timeout=70)
    print("Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        ways = data.get('elements', [])
        print(f"Retrieved {len(ways)} road segments with coordinates!")
        with open('data/raw/osm/alappuzha_roads_detailed.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print("Saved to data/raw/osm/alappuzha_roads_detailed.json")
    else:
        print("Overpass error:", r.text[:200])
except Exception as e:
    print("Failed:", e)
