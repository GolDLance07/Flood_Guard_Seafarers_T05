import requests
import json

mirrors = [
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass-api.de/api/interpreter'
]
headers = {'User-Agent': 'FloodGuardResearch/1.0 (contact@floodguard.org)'}
query = """[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|doctors|pharmacy"](9.3,76.3,9.6,76.65);
);
out count;"""

for m in mirrors:
    try:
        r = requests.post(m, data={'data': query}, headers=headers, timeout=15)
        print(f"{m} -> {r.status_code}")
        if r.status_code == 200:
            print("Success! Elements count:", r.json().get('elements'))
            break
    except Exception as e:
        print(f"{m} -> failed: {e}")

# Check WorldPop India raster download URL
print("\nChecking WorldPop India 2018/2020 raster:")
wp_url = "https://data.worldpop.org/GIS/Population/Global_2000_2020/2018/IND/ind_ppp_2018_UNadj.tif"
try:
    head_resp = requests.head(wp_url, timeout=15, allow_redirects=True)
    print("WorldPop direct TIF status:", head_resp.status_code, "Length:", head_resp.headers.get('content-length'))
except Exception as e:
    print("WorldPop TIF check error:", e)

# Also check Humanitarian Data Exchange (HDX) for Kerala flood 2018 reference data
hdx_url = "https://data.humdata.org/api/3/action/package_search?q=kerala+flood+2018"
try:
    hr = requests.get(hdx_url, timeout=15)
    print("HDX status:", hr.status_code)
    if hr.status_code == 200:
        results = hr.json().get('result', {}).get('results', [])
        print(f"HDX found {len(results)} datasets for Kerala flood 2018")
        for res in results[:3]:
            print(f"  Title: {res.get('title')}")
except Exception as e:
    print("HDX search error:", e)
