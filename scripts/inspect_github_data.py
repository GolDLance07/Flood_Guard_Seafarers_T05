import requests

# 1. Check naveenpf/kerala_data contents
url = "https://api.github.com/repos/naveenpf/kerala_data/contents"
r = requests.get(url, timeout=10)
print("kerala_data status:", r.status_code)
if r.status_code == 200:
    for item in r.json():
        print(f"Item: {item['name']} ({item['type']})")

# 2. Check spatialthoughts 2018 kerala floods script
st_url = "https://raw.githubusercontent.com/spatialthoughts/courses/master/code/gee/sentinel1_flood_mapping.js"
r_st = requests.get(st_url, timeout=10)
print("\nSpatialthoughts GEE script status:", r_st.status_code)
if r_st.status_code == 200:
    print("Script preview:\n", r_st.text[:500])
