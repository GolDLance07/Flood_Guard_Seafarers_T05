import rasterio
from rasterio.windows import from_bounds
import geopandas as gpd
import pandas as pd
import requests
import json

AOI_BBOX = [76.30, 9.30, 76.60, 9.60] # minx, miny, maxx, maxy

# 1. Test WorldPop window read via vsicurl
wp_url = "/vsicurl/https://data.worldpop.org/GIS/Population/Global_2000_2020/2018/IND/ind_ppp_2018_UNadj.tif"
print("Attempting to read WorldPop window for AOI...")
try:
    with rasterio.open(wp_url) as src:
        win = from_bounds(*AOI_BBOX, src.transform)
        arr = src.read(1, window=win)
        win_transform = rasterio.windows.transform(win, src.transform)
        print("Successfully read WorldPop window!")
        print("Shape:", arr.shape)
        print("Valid population sum in AOI:", arr[arr > 0].sum())
        
        # Save clipped population raster
        profile = src.profile.copy()
        profile.update({
            'height': arr.shape[0],
            'width': arr.shape[1],
            'transform': win_transform
        })
        with rasterio.open("data/raw/population/alappuzha_worldpop_2018.tif", "w", **profile) as dst:
            dst.write(arr, 1)
        print("Saved data/raw/population/alappuzha_worldpop_2018.tif")
except Exception as e:
    print("Vsicurl read failed:", e)

# 2. Extract designated relief shelters and hospitals from KSDMA data
print("\nExtracting relief shelters from KSDMA...")
try:
    # Check KSDMA schools/auditoriums in Alappuzha
    df_aud = pd.read_excel("https://raw.githubusercontent.com/naveenpf/kerala_data/master/Kerala_sdma_data/Auditorium-List.xlsx")
    print("Auditorium columns:", df_aud.columns.tolist()[:5])
    # Filter for Alappuzha
    if 'District' in df_aud.columns:
        alp_aud = df_aud[df_aud['District'].str.contains('Alappuzha', case=False, na=False)]
        print("Alappuzha relief auditoriums count:", len(alp_aud))
except Exception as e:
    print("Error reading KSDMA excel:", e)
