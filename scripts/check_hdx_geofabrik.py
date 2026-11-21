import requests
import json

# 1. Search HDX for Kerala datasets
url = "https://data.humdata.org/api/3/action/package_search?q=kerala"
r = requests.get(url, timeout=15)
if r.status_code == 200:
    results = r.json().get('result', {}).get('results', [])
    print(f"HDX found {len(results)} datasets matching 'kerala':")
    for d in results:
        title = d.get('title')
        name = d.get('name')
        print(f"\nDataset: {title} ({name})")
        for res in d.get('resources', [])[:4]:
            print(f"  Resource: {res.get('name')} | Format: {res.get('format')} | URL: {res.get('url')[:100]}")

# 2. Check Geofabrik India subregions
rg = requests.get("https://download.geofabrik.de/asia/india.html", timeout=15)
if rg.status_code == 200:
    import re
    pbfs = re.findall(r'href="([^"]+\.osm\.pbf)"', rg.text)
    print("\nGeofabrik sub-extracts:", pbfs)
