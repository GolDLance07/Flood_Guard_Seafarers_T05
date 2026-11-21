import requests

endpoints = {
    "Geofabrik": "https://download.geofabrik.de/asia/india-latest.osm.pbf",
    "DataMeet GitHub": "https://raw.githubusercontent.com/datameet/maps/master/Districts/Census_2011/2011_Dist.geojson",
    "HDX API": "https://data.humdata.org/api/3/action/package_search?q=kerala+flood",
    "WorldPop": "https://hub.worldpop.org/rest/data/pop/wpgp?iso3=IND",
    "Copernicus OData": "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=1"
}

for name, url in endpoints.items():
    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        print(f"{name}: status {r.status_code}")
    except Exception as e:
        print(f"{name}: failed -> {e}")
