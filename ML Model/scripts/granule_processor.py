import os
import numpy as np
import rasterio
from pyproj import Transformer

class GranuleProcessor:
    """
    Handles processing of raw satellite granules (HDF/GeoTIFF) from NASA EarthData.
    Extracts metrics like NDVI, EVI, and Canopy Density for specific coordinates.
    """
    
    def __init__(self, cache_dir=None):
        if cache_dir is None:
            # Default to relative path from project root
            self.cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'granules')
        else:
            self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)

    def create_dummy_granule(self, lat, lon, name="simulated_granule.tif"):
        """
        Creates a small simulated GeoTIFF for testing the extraction pipeline.
        """
        path = os.path.join(self.cache_dir, name)
        if os.path.exists(path): return path
        
        print(f"Generating Simulation Granule at {path}...")
        # 10x10 pixel grid
        data = np.random.randint(50, 200, (4, 10, 10)).astype(np.float32)
        
        # Define transform (0.01 degree resolution)
        from rasterio.transform import from_origin
        transform = from_origin(lon - 0.05, lat + 0.05, 0.01, 0.01)
        
        with rasterio.open(
            path, 'w',
            driver='GTiff',
            height=10, width=10,
            count=4,
            dtype='float32',
            crs='EPSG:4326',
            transform=transform,
        ) as dst:
            dst.write(data)
        
        return path

    def extract_metrics(self, file_path, lat, lon):
        """
        Extracts spectral metrics from a granule for a given lat/lon.
        """
        try:
            with rasterio.open(file_path) as src:
                # 1. Coordinate Transform (WGS84 Lat/Lon to Granule CRS)
                transformer = Transformer.from_crs("epsg:4326", src.crs, always_xy=True)
                target_x, target_y = transformer.transform(lon, lat)
                
                # 2. Row/Col mapping
                py, px = src.index(target_x, target_y)
                
                # 3. Read Bands (Assumes standard Red/NIR mapping if GeoTIFF)
                # Note: HDF layers would be accessed via subdatasets
                if src.count >= 4:
                    # typical mapping: 1=B, 2=G, 3=R, 4=NIR (simplified)
                    red = src.read(3, window=((py, py+1), (px, px+1)))[0,0]
                    nir = src.read(4, window=((py, py+1), (px, px+1)))[0,0]
                    
                    # Calculate NDVI
                    ndvi = (nir - red) / (nir + red + 1e-10)
                    
                    return {
                        "ndvi": float(ndvi),
                        "source": os.path.basename(file_path),
                        "status": "success"
                    }
        except Exception as e:
            print(f"Extraction Error for {file_path}: {e}")
        
        return None

    def get_regional_avg(self, file_path, center_lat, center_lon, radius_km=5):
        """
        Calculates average metrics over a regional area.
        """
        # (Implementation for regional aggregation would go here)
        pass

if __name__ == "__main__":
    # Test logic (requires a sample file)
    processor = GranuleProcessor()
    print("Granule Processor Ready.")
