import requests
import json
import os
import datetime
from dotenv import load_dotenv
from regions import get_region_metadata

load_dotenv()

def analyze_forest_trend(region_name, years=10):
    """
    Fetch and analyze historical forest loss trends from GFW.
    Returns yearly loss, cumulative loss, and trend metrics.
    """
    region = get_region_metadata(region_name)
    if not region:
        return {"error": f"Region {region_name} not found"}

    bbox = region['bbox']
    current_year = datetime.datetime.now().year
    start_year = current_year - years
    
    # GFW API Configuration
    api_key = os.getenv("GFW_API_KEY", "")
    base_url = "https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query"
    # Simplified SQL: Fetch all years and filter in Python for better API compatibility
    sql = "SELECT umd_tree_cover_loss__year as year, sum(umd_tree_cover_loss__ha) as loss_ha FROM data GROUP BY umd_tree_cover_loss__year ORDER BY umd_tree_cover_loss__year ASC"

    
    # Convert bbox [min_lat, min_lon, max_lat, max_lon] to GeoJSON Polygon
    geometry = {
        "type": "Polygon",
        "coordinates": [[
            [bbox[1], bbox[0]],
            [bbox[3], bbox[0]],
            [bbox[3], bbox[2]],
            [bbox[1], bbox[2]],
            [bbox[1], bbox[0]]
        ]]
    }

    headers = { "Content-Type": "application/json" }
    if api_key:
        headers["x-api-key"] = api_key

    payload = { "sql": sql, "geometry": geometry }

    try:
        print(f"Computing Forest Loss Trends for {region_name} (Years: {start_year}-{current_year})...")
        response = requests.post(base_url, json=payload, headers=headers, timeout=20)
        
        if response.status_code != 200:
             print(f"GFW API Trend Error ({response.status_code}): {response.text[:200]}")
             return {"error": f"GFW API Error: {response.status_code}"}
        
        data = response.json().get("data", [])

        
        if not data:
            return {"error": "No historical data found for this region."}

        # Calculate metrics
        yearly_data = []
        total_loss = 0
        
        for record in data:
            y = record.get("year")
            # Filter by year in Python
            if y and start_year <= int(y) <= current_year:
                loss = record.get("loss_ha") or 0
                yearly_data.append({"year": int(y), "loss": float(loss)})
                total_loss += loss


        # Trend Calculations
        first_year_loss = yearly_data[0]["loss"]
        last_year_loss = yearly_data[-1]["loss"]
        
        yoy_change = 0
        if len(yearly_data) > 1:
            prev_loss = yearly_data[-2]["loss"]
            if prev_loss > 0:
                yoy_change = ((last_year_loss - prev_loss) / prev_loss) * 100

        avg_loss = total_loss / len(yearly_data)
        
        # Trend Factor (used for ML)
        # 1.0 = Average, >1.0 = Accelerating loss, <1.0 = Decelerating
        trend_factor = 1.0
        if first_year_loss > 0:
            trend_factor = last_year_loss / first_year_loss

        return {
            "region": region_name,
            "analysis_period": f"{start_year}-{current_year}",
            "summary": {
                "total_loss_ha": round(total_loss, 2),
                "average_annual_loss": round(avg_loss, 2),
                "yoy_change_pct": round(yoy_change, 2),
                "trend_factor": round(float(trend_factor), 3)
            },
            "yearly_trends": yearly_data,
            "status": "success"
        }

    except Exception as e:
        print(f"Trend Analysis Error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import sys
    region = sys.argv[1] if len(sys.argv) > 1 else "Mansehra"
    result = analyze_forest_trend(region)
    print("__JSON_START__")
    print(json.dumps(result, indent=2))
    print("__JSON_END__")
