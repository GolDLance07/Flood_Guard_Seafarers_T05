import requests
import json

url = 'https://overpass-api.de/api/interpreter'
query = """[out:json][timeout:50];
(
  node["amenity"~"hospital|clinic|doctors|pharmacy"](9.30,76.30,9.60,76.65);
  node["place"~"town|village|suburb|hamlet"](9.30,76.30,9.60,76.65);
);
out center;
"""
headers = {'User-Agent': 'FloodGuardApp/1.0 (dev@floodguard.io)'}
try:
    print("Sending query to Overpass (timeout=60s)...")
    r = requests.post(url, data={'data': query}, headers=headers, timeout=60)
    print("Status:", r.status_code)
    if r.status_code == 200:
        elems = r.json().get('elements', [])
        print(f"Retrieved {len(elems)} facilities and settlements!")
        with open('data/raw/osm/alappuzha_facilities_and_places.json', 'w', encoding='utf-8') as f:
            json.dump(r.json(), f, indent=2)
        print("Saved to data/raw/osm/alappuzha_facilities_and_places.json")
    else:
        print("Response text:", r.text[:200])
except Exception as e:
    print("Failed:", e)
