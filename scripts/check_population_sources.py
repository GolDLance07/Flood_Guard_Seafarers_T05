import requests
import json

# Search HDX for Kerala population datasets
url = "https://data.humdata.org/api/3/action/package_search?q=kerala+population"
r = requests.get(url, timeout=15)
if r.status_code == 200:
    results = r.json().get('result', {}).get('results', [])
    print(f"HDX found {len(results)} datasets matching 'kerala population':")
    for d in results[:5]:
        print(f"Dataset: {d.get('title')}")
        for res in d.get('resources', [])[:3]:
            print(f"  Resource: {res.get('name')} | Format: {res.get('format')} | URL: {res.get('url')}")

# Also check WorldPop API for India subnational or 1km
wp_url = "https://hub.worldpop.org/rest/data/pop/wpgp?iso3=IND"
r2 = requests.get(wp_url, timeout=15)
if r2.status_code == 200:
    items = r2.json().get('data', [])
    print(f"\nWorldPop IND datasets: {len(items)}")
    for it in items[:10]:
        print(f"  {it.get('title')} ({it.get('popyear')}) -> {it.get('files')}")
