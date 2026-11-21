import requests
import json

# Test Copernicus download endpoint without auth
product_id = "211ae2d0-a8d4-495b-af81-1899c0c2d628" # COG safe
url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value"
try:
    r = requests.get(url, stream=True, timeout=10)
    print("Copernicus direct download status:", r.status_code)
    # usually requires OAuth2 access token: https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
except Exception as e:
    print("Copernicus download check:", e)

# Test Overpass query for roads and facilities in AOI:
# Bbox: 9.30, 76.30, 9.60, 76.65
overpass_url = "https://overpass.osm.ch/api/interpreter"
headers = {'User-Agent': 'FloodGuard/1.0 (dev@floodguard.io)'}
query = """[out:json][timeout:30];
(
  node["amenity"~"hospital|clinic|doctors|shelter|pharmacy"](9.30,76.30,9.60,76.65);
  way["highway"~"primary|secondary|tertiary|trunk|residential"](9.35,76.35,9.55,76.60);
  node["place"~"town|village|suburb|hamlet"](9.30,76.30,9.60,76.65);
);
out body;
"""
try:
    ro = requests.post(overpass_url, data={'data': query}, headers=headers, timeout=25)
    print("Overpass query status:", ro.status_code)
    if ro.status_code == 200:
        data = ro.json()
        print(f"Overpass returned {len(data.get('elements', []))} elements!")
        with open('data/raw/osm/sample_osm.json', 'w') as f:
            json.dump(data, f)
        print("Saved sample_osm.json")
except Exception as e:
    print("Overpass error:", e)
