import requests
import json

# 1. Print Copernicus collections
r = requests.get('https://catalogue.dataspace.copernicus.eu/stac/collections', timeout=20)
if r.status_code == 200:
    for c in r.json().get('collections', []):
        print("Collection:", c.get('id'), "| Title:", c.get('title'))

# 2. Check Copernicus OData API for Sentinel-1
# Docs: https://documentation.dataspace.copernicus.eu/APIs/OData.html
odata_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=Collection/Name eq 'SENTINEL-1' and contains(Name,'GRD') and ContentDate/Start gt 2018-08-01T00:00:00.000Z and ContentDate/Start lt 2018-08-25T00:00:00.000Z and OData.CSC.Intersects(area=geography'SRID=4326;POLYGON((76.3 9.3, 76.65 9.3, 76.65 9.6, 76.3 9.6, 76.3 9.3))')&$top=10"
print("\nQuerying Copernicus OData API...")
try:
    ro = requests.get(odata_url, timeout=25)
    print("OData status:", ro.status_code)
    if ro.status_code == 200:
        val = ro.json().get('value', [])
        print(f"OData found {len(val)} products:")
        for p in val:
            print(f"  Name: {p.get('Name')}")
            print(f"  Id: {p.get('Id')}")
            print(f"  Date: {p.get('ContentDate', {}).get('Start')}")
            print(f"  Footprint: {p.get('Footprint')[:100]}...")
except Exception as e:
    print("OData error:", e)

# 3. Test Overpass mirrors
mirrors = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter"
]
headers = {'User-Agent': 'FloodGuard-DisasterIntelligence/1.0 (contact@floodguard.io)'}
query = """
[out:json][timeout:25];
node["amenity"="hospital"](9.3,76.3,9.6,76.65);
out count;
"""
for m in mirrors:
    try:
        rm = requests.post(m, data={'data': query}, headers=headers, timeout=15)
        print(f"Mirror {m} -> status {rm.status_code}")
        if rm.status_code == 200:
            print(f"  Count: {rm.json().get('elements')}")
            break
    except Exception as em:
        print(f"Mirror {m} failed: {em}")
