import requests
import json

base_url = "https://api.github.com/repos/naveenpf/kerala_data/contents"

dirs_to_check = [
    "Kerala_flood_pain_2018",
    "Kerala_Roads",
    "Kerala_Govt_Buildings",
    "Kerala_sdma_data",
    "Kerala_Environment"
]

for d in dirs_to_check:
    r = requests.get(f"{base_url}/{d}", timeout=10)
    print(f"\n--- Directory: {d} (Status: {r.status_code}) ---")
    if r.status_code == 200:
        for f in r.json():
            print(f"  {f.get('name')} | Size: {f.get('size')} | Download: {f.get('download_url')}")
