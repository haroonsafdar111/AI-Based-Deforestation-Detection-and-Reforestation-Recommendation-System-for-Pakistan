import sys
import json
from nasa_power_climate import fetch_climate_data
from earthdata_environmental import fetch_environmental_data
from gfw_forest_data import fetch_forest_data
from forest_trend_analysis import analyze_forest_trend
from regions import validate_region

def run_unified_pipeline(region_name, start_date, end_date):
    """
    Orchestrate all data pipelines for a specific region and time range.
    """
    if not validate_region(region_name):
        return {"error": f"Invalid region: {region_name}"}

    print(f"Starting unified pipeline for {region_name}...")

    # Fetch data from all pipelines
    climate = fetch_climate_data(region_name, start_date, end_date)
    environmental = fetch_environmental_data(region_name, {"start": start_date, "end": end_date})
    forest = fetch_forest_data(region_name, start_date.split('-')[0])
    trends = analyze_forest_trend(region_name)

    # Combine results
    results = {
        "region": region_name,
        "time_range": {"start": start_date, "end": end_date},
        "climate_data": climate,
        "environmental_data": environmental,
        "forest_data": forest,
        "forest_trends": trends,
        "status": "success"
    }

    return results

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Missing arguments. Usage: python orchestrator.py <region> <start_date> <end_date>"}))
    else:
        region = sys.argv[1]
        start = sys.argv[2]
        end = sys.argv[3]
        
        try:
            output = run_unified_pipeline(region, start, end)

            print("__JSON_START__")
            print(json.dumps(output, indent=2))
            print("__JSON_END__")
        except Exception as e:
            print("__JSON_START__")
            print(json.dumps({"error": str(e)}))
            print("__JSON_END__")
