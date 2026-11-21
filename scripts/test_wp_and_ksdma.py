import requests
import pandas as pd
import json

# 1. Check WorldPop 1km resolution file size
url_1km = "https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2018/IND/ind_ppp_2018_1km_Aggregated_UNadj.tif"
try:
    r = requests.head(url_1km, timeout=10)
    print("WorldPop 1km status:", r.status_code, "Length:", r.headers.get('content-length'))
except Exception as e:
    print("WorldPop 1km error:", e)

# 2. Check KSDMA auditoriums/schools/shelters
aud_url = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_sdma_data/Auditorium-List.xlsx"
df_aud = pd.read_excel(aud_url)
print("\nAuditorium columns:", df_aud.columns.tolist())
print("Total rows:", len(df_aud))
print(df_aud.head(3))

# Check schools
schools_url = "https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_sdma_data/KSDMA-Schools.xlsx"
df_sch = pd.read_excel(schools_url)
print("\nSchools columns:", df_sch.columns.tolist())
print("Total schools:", len(df_sch))
print(df_sch.head(3))
