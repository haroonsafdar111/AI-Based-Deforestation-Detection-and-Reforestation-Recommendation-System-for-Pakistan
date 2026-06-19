import requests
import pandas as pd
import json
import os
from dotenv import load_dotenv
from regions import get_region_metadata

load_dotenv()

def fetch_climate_data(region_name, start_date, end_date):
    """
    Fetch climate data from NASA POWER API.
    NOTE: NASA POWER API for point data does not require an API key or authentication.
    """
    region = get_region_metadata(region_name)
    if not region:
        return {"error": f"Region {region_name} not found"}

    # Calculate centroid for point-based API request
    lat = (region['bbox'][0] + region['bbox'][2]) / 2
    lon = (region['bbox'][1] + region['bbox'][3]) / 2

    # NASA POWER API URL
    # Documentation: https://power.larc.nasa.gov/docs/v3/api/temporal/daily/point/
    base_url = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/daily/point")
    
    # Parameters for Forest Analysis:
    # T2M: Temperature at 2m (C)
    # PRECTOTCORR: Precipitation (mm/day)
    # RH2M: Relative Humidity at 2m (%)
    # ALLSKY_SFC_SW_DWN: Solar Radiation (MJ/m^2/day)
    # WS2M: Wind Speed at 2m (m/s)
    params = {
        "parameters": "T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M",
        "community": "SB", # Sustainable Buildings community
        "longitude": lon,
        "latitude": lat,
        "start": start_date.replace('-', ''),
        "end": end_date.replace('-', ''),
        "format": "JSON"
    }

    try:
        print(f"Connecting to NASA POWER API for {region_name} ({lat:.4f}, {lon:.4f})...")
        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Extract nested parameters: properties -> parameter -> {PARAM: {DATE: VALUE}}
        if 'properties' not in data or 'parameter' not in data['properties']:
            return {"error": "Unexpected API response structure"}

        params_data = data['properties']['parameter']
        df = pd.DataFrame(params_data)
        
        # Convert index (YYYYMMDD) to datetime and reset index to include DATE column
        df.index = pd.to_datetime(df.index, format='%Y%m%d')
        df = df.reset_index().rename(columns={'index': 'date'})
        
        # Handle invalid/missing values (NASA POWER uses -999 for missing)
        df = df.replace(-999, float('nan'))

        # Prepare summary metrics
        summary = {
            "avg_temp": float(df['T2M'].mean()) if 'T2M' in df.columns else None,
            "total_precipitation": float(df['PRECTOTCORR'].sum()) if 'PRECTOTCORR' in df.columns else None,
            "avg_humidity": float(df['RH2M'].mean()) if 'RH2M' in df.columns else None,
            "avg_solar_radiation": float(df['ALLSKY_SFC_SW_DWN'].mean()) if 'ALLSKY_SFC_SW_DWN' in df.columns else None,
            "max_wind_speed": float(df['WS2M'].max()) if 'WS2M' in df.columns else None,
            "data_completeness": float(df.notnull().mean().mean()) # Percentage of non-nan values
        }

        # Convert date to string for JSON serialization
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')

        return {
            "region": region_name,
            "coordinates": {"lat": lat, "lon": lon},
            "source": "NASA POWER (No-Auth Access)",
            "time_range": {"start": start_date, "end": end_date},
            "summary": summary,
            "daily_data": df.to_dict(orient='records')
        }

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return {"error": f"NASA API HTTP error: {http_err}"}
    except Exception as e:
        print(f"Error fetching climate data: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    # Example usage with updated region
    test_region = "Punjab"
    print(f"--- Running NASA POWER Pipeline Test for {test_region} ---")
    result = fetch_climate_data(test_region, "2023-10-01", "2023-10-10")
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Successfully fetched data for {result['region']}")
        print(f"Summary: {json.dumps(result['summary'], indent=2)}")
        print(f"Check: First day data point: {result['daily_data'][0]}")
