import requests
import json

class Region:
    def __init__(self, name, bbox, geojson=None):
        self.name = name
        self.bbox = bbox # [min_lat, min_lon, max_lat, max_lon]
        self.geojson = geojson

REGIONS = {
    "Khyber Pakhtunkhwa (KP)": Region(
        name="Khyber Pakhtunkhwa (KP)",
        bbox=[31.00, 68.75, 37.04, 74.76],
        geojson={"type": "Polygon", "coordinates": [[[68.75, 31.00], [74.76, 31.00], [74.76, 37.04], [68.75, 37.04], [68.75, 31.00]]]}
    ),
    "Islamabad Capital Territory & Margalla Region": Region(
        name="Islamabad Capital Territory & Margalla Region",
        bbox=[33.40, 72.80, 33.90, 73.40],
        geojson={"type": "Polygon", "coordinates": [[[72.80, 33.40], [73.40, 33.40], [73.40, 33.90], [72.80, 33.90], [72.80, 33.40]]]}
    ),
    "Punjab": Region(
        name="Punjab",
        bbox=[27.50, 69.15, 34.20, 75.60],
        geojson={"type": "Polygon", "coordinates": [[[69.15, 27.50], [75.60, 27.50], [75.60, 34.20], [69.15, 34.20], [69.15, 27.50]]]}
    ),
    "Sindh": Region(
        name="Sindh",
        bbox=[23.39, 66.32, 28.80, 71.31],
        geojson={"type": "Polygon", "coordinates": [[[66.32, 23.39], [71.31, 23.39], [71.31, 28.80], [66.32, 28.80], [66.32, 23.39]]]}
    ),
    "Balochistan": Region(
        name="Balochistan",
        bbox=[24.70, 60.64, 32.23, 70.43],
        geojson={"type": "Polygon", "coordinates": [[[60.64, 24.70], [70.43, 24.70], [70.43, 32.23], [60.64, 32.23], [60.64, 24.70]]]}
    ),
    "Gilgit-Baltistan (GB)": Region(
        name="Gilgit-Baltistan (GB)",
        bbox=[34.50, 72.50, 37.10, 77.50],
        geojson={"type": "Polygon", "coordinates": [[[72.50, 34.50], [77.50, 34.50], [77.50, 37.10], [72.50, 37.10], [72.50, 34.50]]]}
    ),
    "Azad Jammu & Kashmir (AJK)": Region(
        name="Azad Jammu & Kashmir (AJK)",
        bbox=[32.80, 73.30, 35.20, 75.20],
        geojson={"type": "Polygon", "coordinates": [[[73.30, 32.80], [75.20, 32.80], [75.20, 35.20], [73.30, 35.20], [73.30, 32.80]]]}
    )
}

# Data copied from Frontend/src/data/regionCoordinates.js (Synced with Node backend)
CITY_COORDINATES = {
    'Pakistan': [30.3753, 69.3451, 5],
    'All Regions': [30.3753, 69.3451, 5],
    'Khyber Pakhtunkhwa (KP)': [34.9526, 72.3311, 7],
    'Islamabad Capital Territory & Margalla Region': [33.7294, 73.0931, 11],
    'Punjab': [31.1704, 72.7097, 7],
    'Sindh': [25.8943, 68.5247, 7],
    'Balochistan': [28.4907, 65.0958, 6],
    'Gilgit-Baltistan (GB)': [35.8026, 74.9832, 7],
    'Azad Jammu & Kashmir (AJK)': [33.9256, 73.7478, 8],
    'Abbottabad': [34.1688, 73.2215, 11],
    'Nathia Gali': [34.0667, 73.3833, 13],
    'Dunga Gali': [34.0583, 73.3516, 13],
    'Khanspur': [34.0189, 73.4150, 13],
    'Thandiani': [34.2464, 73.3524, 13],
    'Ghora Dhaka': [34.0253, 73.3944, 13],
    'Ayubia': [34.0315, 73.4011, 13],
    'Sherwan': [34.1947, 73.0489, 12],
    'Makhniyal': [33.8242, 73.1492, 12],
    'Peshawar': [34.0151, 71.5249, 11],
    'Mardan': [34.1986, 72.0404, 11],
    'Kohat': [33.5819, 71.4429, 11],
    'Galyat & Hazara Forest Belt': [34.08, 73.35, 10],
    'Balakot': [34.5492, 73.3508, 12],
    'Mahandri': [34.6853, 73.4219, 12],
    'Paras': [34.6475, 73.3828, 12],
    'Shinu': [34.7200, 73.4500, 12],
    'Jared': [34.7000, 73.4400, 12],
    'Naran': [34.9083, 73.6458, 13],
    'Shinkiari (Siran forest belt)': [34.4697, 73.2450, 11],
    'Kaghan–Mansehra–Siran Forest Zone': [34.7, 73.5, 10],
    'Mingora': [34.7717, 72.3601, 12],
    'Saidu Sharif': [34.7500, 72.3500, 12],
    'Kalam': [35.4806, 72.5861, 13],
    'Ushu': [35.5333, 72.6833, 13],
    'Bahrain': [35.2047, 72.5456, 12],
    'Madyan': [35.1325, 72.5361, 12],
    'Swat': [35.2227, 72.4258, 10],
    'Swat–Malakand Forest Belt': [35.0, 72.5, 9],
    'Dir': [35.2000, 71.8700, 10],
    'Chitral': [35.8500, 71.7833, 11],
    'Daggar (Buner)': [34.5083, 72.4833, 11],
    'Alpuri (Shangla)': [34.9000, 72.6333, 11],
    'Dassu': [35.2917, 73.2167, 11],
    'Pattan': [35.1200, 73.0200, 11],
    'Besham': [34.9167, 72.8667, 11],
    'Palas Valley settlements': [35.0833, 73.1667, 12],
    'Islamabad': [33.6844, 73.0479, 11],
    'Shah Allah Ditta': [33.7437, 72.9189, 13],
    'Saidpur': [33.7442, 73.0658, 13],
    'Gokina': [33.7700, 73.0800, 13],
    'Bhara Kahu': [33.7497, 73.1819, 12],
    'Trail-side settlements (Trails 3, 5, 6 belt)': [33.7500, 73.0500, 13],
    'Margalla Hills settlements (National Park region)': [33.7437, 73.0238, 12],
    'Murree': [33.9070, 73.3943, 13],
    'Kotli Sattian': [33.8056, 73.5189, 12],
    'Kallar Syedan (upper belt)': [33.5667, 73.3667, 12],
    'Khabeki': [32.6167, 72.2333, 13],
    'Naushera': [32.5833, 72.1667, 12],
    'Soon Valley settlements': [32.5833, 72.1667, 12],
    'Chichawatni': [30.5333, 72.7000, 12],
    'Lahore': [31.5204, 74.3587, 11],
    'Faisalabad': [31.4504, 73.1350, 11],
    'Rawalpindi': [33.5651, 73.0169, 11],
    'Multan': [30.1575, 71.5249, 11],
    'Gujranwala': [32.1877, 74.1945, 11],
    'Sialkot': [32.4945, 74.5229, 11],
    'Bahawalpur': [29.3544, 71.6911, 11],
    'Sargodha': [32.0745, 72.6861, 11],
    'Changa Manga': [31.1833, 73.9667, 13],
    'Gatwala (near Faisalabad)': [31.4833, 73.1667, 13],
    'Rakh Jhok (Sheikhupura)': [31.5, 74.0, 12],
    'Pirowal (near Khanewal)': [30.3833, 72.0667, 13],
    'Daphar / Pindi Bhattian': [32.1833, 73.3, 12],
    'Mandi Bahauddin / Phalia (Mona–Daphar)': [32.5833, 73.4833, 11],
    'Shorkot': [30.8333, 72.0667, 12],
    'Kundian': [32.4500, 71.4667, 12],
    'Dera Ghazi Khan': [30.0500, 70.6333, 11],
    'Taunsa Sharif': [30.7000, 70.6500, 11],
    'Layyah': [30.9667, 70.9333, 11],
    'Muzaffargarh': [30.0667, 71.1833, 11],
    'Kot Addu': [30.4667, 70.9667, 11],
    'Sukkur': [27.7052, 68.8574, 11],
    'Rohri': [27.6833, 68.9000, 12],
    'Shikarpur': [27.9500, 68.6333, 11],
    'Ghotki': [28.0000, 69.3167, 11],
    'Kandhkot': [28.2333, 69.1833, 11],
    'Kashmore': [28.4333, 69.5833, 11],
    'Sehwan': [26.4167, 67.8667, 11],
    'Dadu': [26.7333, 67.7833, 11],
    'Keti Bunder': [24.1444, 67.4500, 12],
    'Shah Bunder': [24.1667, 67.9, 12],
    'Kharo Chan': [24.0833, 67.5833, 12],
    'Jati': [24.3500, 68.2667, 12],
    'Mirpur Sakro': [24.5500, 67.6333, 12],
    'Ghorabari': [24.5, 67.75, 12],
    'Sanghar / Sinjhoro (Makhi Forest area)': [26.0464, 68.9481, 11],
    'Badin (Hadero Lake forests)': [24.6500, 68.8333, 11],
    'Karachi (Clifton Urban Forest zone)': [24.8117, 67.0253, 14],
    'Hyderabad': [25.3960, 68.3578, 11],
    'Larkana': [27.5589, 68.2020, 11],
    'Mirpur Khas': [25.5276, 69.0159, 11],
    'Ziarat': [30.3814, 67.7258, 12],
    'Quetta': [30.1798, 66.9750, 11],
    'Kalat': [29.0222, 66.5917, 11],
    'Khuzdar': [27.8000, 66.6167, 11],
    'Gwadar': [25.1216, 62.3254, 11],
    'Turbat': [26.0012, 63.0485, 11],
    'Loralai': [30.3700, 68.5981, 11],
    'Harnai': [30.1, 67.9333, 11],
    'Barkhan': [29.8914, 69.7214, 11],
    'Musakhel': [30.8667, 70.1, 11],
    'Zarghoon / Hanna (near Quetta)': [30.2500, 67.1667, 12],
    'Harboi (near Kalat)': [28.9167, 66.6667, 12],
    'Takatu Mountain settlements': [30.3167, 67.0833, 12],
    'Suleiman Range foothill settlements': [31.0, 70.0, 10],
    'Gilgit': [35.9221, 74.3087, 12],
    'Skardu': [35.2951, 75.6331, 11],
    'Astore': [35.3667, 74.9000, 11],
    'Rama Meadows settlements': [35.2, 74.8, 13],
    'Hunza': [36.3167, 74.6500, 11],
    'Nagar': [36.1667, 74.8, 11],
    'Gahkuch (Ghizer)': [36.1667, 73.7667, 11],
    'Phander': [36.1833, 72.9333, 12],
    'Yasin': [36.3667, 73.3333, 11],
    'Bagrot Valley settlements': [35.9667, 74.5333, 12],
    'Naltar Bala': [36.1333, 74.1333, 12],
    'Muzaffarabad': [34.3700, 73.4711, 12],
    'Rawalakot': [33.8583, 73.7611, 12],
    'Bagh': [33.9800, 73.7800, 12],
    'Kotli': [33.5167, 73.9, 12],
    'Bhimber': [32.9833, 74.0833, 12],
    'Neelum Valley towns': [34.5, 73.9, 10],
    'Keran': [34.6667, 73.95, 13],
    'Sharda': [34.7936, 74.1906, 13],
    'Leepa / Reshian': [34.3, 73.8, 12],
    'Forward Kahuta (Haveli)': [33.8833, 74.1, 12],
    'Mong (Sudhnoti)': [33.7, 73.6167, 12],
    'Pir Chinasi region': [34.3833, 73.5333, 12],
    'Tolipir region': [33.8833, 73.8167, 12],
    'University Town': [33.9943, 71.4753, 14],
    'Hayatabad (Phases 1-7)': [33.9786, 71.4325, 14],
    'Saddar': [34.0049, 71.5372, 14],
    'Gulbahar': [34.0125, 71.5642, 14],
    'Kohat Road': [33.9850, 71.5120, 14],
    'Ring Road Area': [33.9700, 71.5500, 14],
    'Tehkal': [34.0050, 71.4900, 14],
    'Dabgari': [34.0080, 71.5450, 14],
    'Hashtnagri': [34.0150, 71.5550, 14],
    'Board Bazaar': [34.0020, 71.4780, 14],
    'Jinnahabad': [34.1750, 73.2250, 14],
    'Mandian': [34.1950, 73.2420, 14],
    'Supply Bazaar': [34.1650, 73.2200, 14],
    'Kehal': [34.1550, 73.2150, 14],
    'Malikpura': [34.1620, 73.2180, 14],
    'Nawanshehr': [34.1700, 73.2550, 14],
    'PMA / Kakul Area': [34.1850, 73.2600, 14],
    'Bilal Town': [34.1880, 73.2350, 14],
    'F-6': [33.7297, 73.0744, 14],
    'F-7': [33.7200, 73.0550, 14],
    'F-8': [33.7100, 73.0350, 14],
    'F-10': [33.7000, 73.0050, 14],
    'F-11': [33.6900, 72.9850, 14],
    'G-6': [33.7100, 73.0850, 14],
    'G-7': [33.7000, 73.0650, 14],
    'G-8': [33.6900, 73.0450, 14],
    'G-9': [33.6800, 73.0250, 14],
    'G-10': [33.6700, 73.0050, 14],
    'G-11': [33.6600, 72.9850, 14],
    'I-8': [33.6500, 73.0750, 14],
    'I-9': [33.6400, 73.0550, 14],
    'I-10': [33.6300, 73.0350, 14],
    'E-7 (Diplomatic area)': [33.7250, 73.0450, 14],
    'Bahria Town (nearby)': [33.5100, 73.1000, 14],
    'DHA Islamabad': [33.5200, 73.1500, 14],
    'Bani Gala': [33.7150, 73.1550, 14],
    'Gulberg': [31.5100, 74.3450, 14],
    'DHA (Phases 1-9)': [31.4700, 74.4500, 13],
    'Johar Town': [31.4700, 74.2700, 14],
    'Model Town': [31.4850, 74.3250, 14],
    'Township': [31.4550, 74.3050, 14],
    'Cantt': [31.5200, 74.3900, 14],
    'Wapda Town': [31.4350, 74.2550, 14],
    'Bahria Town': [31.3650, 74.1850, 14],
    'Valencia': [31.4050, 74.2650, 14],
    'Allama Iqbal Town': [31.5150, 74.2950, 14],
    'DHA (Phases 1-8)': [24.8100, 67.0600, 13],
    'Clifton': [24.8150, 67.0350, 14],
    'Gulshan-e-Iqbal': [24.9150, 67.0950, 14],
    'North Nazimabad': [24.9350, 67.0450, 14],
    'North Karachi': [24.9750, 67.0650, 14],
    'Gulistan-e-Johar': [24.9150, 67.1350, 14],
    'Korangi': [24.8350, 67.1350, 14],
    'Malir': [24.8950, 67.1950, 14],
    'Bahria Town Karachi': [24.9750, 67.3350, 13]
}

def get_region_metadata(region_name):
    """Fetch region metadata by name with robust normalization and fuzzy matching."""
    if not region_name:
        return None

    # Normalize input: lowercase, trim, and standardize dashes
    normalized_input = region_name.lower().strip().replace('–', '-').replace('—', '-')

    # 1. Check Standard Provinces (Static BBOX)
    for key, region in REGIONS.items():
        normalized_key = key.lower().replace('–', '-').replace('—', '-')
        if normalized_key == normalized_input:
            return {
                "name": region.name,
                "bbox": region.bbox,
                "geojson": region.geojson
            }
    
    # 2. Check City Coordinates (Dynamic BBOX)
    for key, coords in CITY_COORDINATES.items():
        normalized_key = key.lower()
        if normalized_key == normalized_input:
            lat, lon, zoom = coords
            offset = 0.05
            return {
                "name": key,
                "bbox": [lat - offset, lon - offset, lat + offset, lon + offset],
                "geojson": None
            }

    # 3. Fuzzy/Partial Match for REGIONS (e.g. "Forward Kahuta" -> "Forward Kahuta (Haveli)")
    for key, region in REGIONS.items():
        normalized_key = key.lower().replace('–', '-').replace('—', '-')
        if normalized_input in normalized_key or normalized_key in normalized_input:
             return {
                "name": region.name,
                "bbox": region.bbox,
                "geojson": region.geojson
            }

    # 4. Fuzzy/Partial Match for CITY_COORDINATES
    for key, coords in CITY_COORDINATES.items():
        normalized_key = key.lower()
        # Clean both for strict alphabetic match (handles "Manshera" vs "Mansehra")
        clean_key = ''.join(filter(str.isalpha, normalized_key))
        clean_input = ''.join(filter(str.isalpha, normalized_input))
        
        if clean_key == clean_input or normalized_input in normalized_key:
            lat, lon, zoom = coords
            offset = 0.05
            return {
                "name": key,
                "bbox": [lat - offset, lon - offset, lat + offset, lon + offset],
                "geojson": None
            }

    return None

def validate_region(region_name):
    """Validate if the region exists."""
    return get_region_metadata(region_name) is not None
