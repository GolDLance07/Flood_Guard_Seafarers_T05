import requests

servers = [
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
]

query = """[out:json][timeout:25];
node["amenity"="hospital"](9.45,76.30,9.55,76.40);
out body;
"""
headers = {'User-Agent': 'FloodGuard/1.0 (contact@floodguard.io)'}

for s in servers:
    try:
        r = requests.post(s, data={'data': query}, headers=headers, timeout=12)
        print(f"{s} -> {r.status_code}")
        if r.status_code == 200:
            elems = r.json().get('elements', [])
            print(f"  Found {len(elems)} hospitals in Alappuzha town!")
            if len(elems) > 0:
                print(f"  Example: {elems[0].get('tags', {}).get('name')}")
                break
    except Exception as e:
        print(f"{s} -> error: {e}")
