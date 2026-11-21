import json
import requests
import sys

AOI_BBOX = [76.30, 9.30, 76.65, 9.60]  # min_lon, min_lat, max_lon, max_lat (Alappuzha/Kuttanad)

def verify_copernicus():
    print("--- 1. Querying Copernicus Data Space STAC API ---")
    stac_url = "https://catalogue.dataspace.copernicus.eu/stac/search"
    payload = {
        "collections": ["SENTINEL-1"],
        "bbox": AOI_BBOX,
        "datetime": "2018-08-01T00:00:00Z/2018-08-25T23:59:59Z",
        "limit": 20
    }
    try:
        resp = requests.post(stac_url, json=payload, timeout=25)
        print(f"STAC search status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            features = data.get("features", [])
            print(f"Found {len(features)} Sentinel-1 scenes:")
            scenes = []
            for f in features:
                props = f.get("properties", {})
                scene_info = {
                    "id": f.get("id"),
                    "datetime": props.get("datetime"),
                    "orbitDirection": props.get("sat:orbit_state", props.get("orbitDirection")),
                    "relativeOrbit": props.get("sat:relative_orbit", props.get("relativeOrbitNumber")),
                    "polarisation": props.get("polarization:values", props.get("polarisationChannels")),
                    "productType": props.get("s1:product_type", props.get("productType")),
                    "bbox": f.get("bbox")
                }
                scenes.append(scene_info)
                print(f"  ID: {scene_info['id']} | Date: {scene_info['datetime']} | Type: {scene_info['productType']} | Orbit: {scene_info['orbitDirection']} (Rel: {scene_info['relativeOrbit']})")
            return scenes
        else:
            print(f"STAC query error: {resp.text[:300]}")
    except Exception as e:
        print(f"Error querying Copernicus STAC: {e}")
    return []

def verify_osm():
    print("\n--- 2. Querying OSM Overpass API for AOI ---")
    overpass_url = "https://overpass-api.de/api/interpreter"
    # Query road count and hospital/shelter counts in bbox: south, west, north, east
    s, w, n, e = AOI_BBOX[1], AOI_BBOX[0], AOI_BBOX[3], AOI_BBOX[2]
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"hospital|clinic|doctors|shelter"]({s},{w},{n},{e});
      way["highway"~"primary|secondary|tertiary|trunk|residential"]({s},{w},{n},{e});
      node["place"~"town|village|suburb|hamlet"]({s},{w},{n},{e});
    );
    out tags;
    """
    try:
        resp = requests.post(overpass_url, data={"data": query}, timeout=30)
        print(f"Overpass status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            elements = data.get("elements", [])
            hospitals = [x for x in elements if x.get("tags", {}).get("amenity") in ["hospital", "clinic", "doctors", "shelter"]]
            roads = [x for x in elements if "highway" in x.get("tags", {})]
            places = [x for x in elements if "place" in x.get("tags", {})]
            print(f"Extracted OSM elements in AOI: Total={len(elements)}, Roads={len(roads)}, Facilities={len(hospitals)}, Settlements={len(places)}")
            return {"total": len(elements), "roads": len(roads), "facilities": len(hospitals), "settlements": len(places)}
        else:
            print(f"Overpass error: {resp.text[:200]}")
    except Exception as e:
        print(f"Error querying Overpass: {e}")
    return None

def verify_worldpop():
    print("\n--- 3. Verifying WorldPop Population API/Data ---")
    # WorldPop API or Hub check for India
    url = "https://hub.worldpop.org/rest/data/pop/wpgp"
    params = {"iso3": "IND"}
    try:
        resp = requests.get(url, params=params, timeout=20)
        print(f"WorldPop API status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("data", [])
            print(f"Found {len(items)} WorldPop datasets for IND.")
            sample = items[0] if items else {}
            print(f"  Latest title: {sample.get('title')}, year: {sample.get('popyear')}")
            return items
        else:
            print(f"WorldPop API returned: {resp.status_code}")
    except Exception as e:
        print(f"WorldPop error: {e}")
    return None

if __name__ == "__main__":
    scenes = verify_copernicus()
    osm = verify_osm()
    wp = verify_worldpop()
