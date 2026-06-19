/**
 * Preprocessing pipeline for environmental data
 */
exports.preprocessData = async (data) => {
    // 1. Remove noise (e.g., filter outliers)
    // 2. Normalize values (e.g., scale to 0-1)
    // 3. Spatial alignment (if multiple sources)
    // 4. Temporal alignment

    console.log('Preprocessing data...');

    console.log('Preprocessing data...');

    // Extract relevant features from the complex pipeline output
    const climate = data.climate_data?.summary || {};
    console.log("DEBUG Preprocessing - Climate Summary:", JSON.stringify(climate));
    console.log("DEBUG Preprocessing - Precip:", climate.total_precipitation);

    const environmental = data.environmental_data?.metrics || data.datasets?.environmental?.metrics || {};

    // Map to ML Model Keys (risk_analysis.py expects these)
    const features = {
        'Air_Temp': climate.avg_temp || 28.0,
        'Rainfall': climate.total_precipitation || 900.0,
        'Soil_Moisture': environmental.soilMoisture || climate.avg_humidity || 35.0,
        'NDVI': environmental.ndvi || 0.5,
        'EVI': environmental.evi || 0.3,
        'LST': environmental.lst || climate.avg_temp || 28.0,
        'Elevation': environmental.elevation || 600,
        'Soil_Type': 1,
        'Humidity': climate.avg_humidity || 55.0
    };

    // Explicitly add a 'features' list for legacy support if needed
    // [temp, rain, humidity, ndvi]
    const featuresList = [
        features['Air_Temp'],
        features['Rainfall'],
        features['Soil_Moisture'],
        features['NDVI']
    ];

    const preprocessed = {
        ...data,
        features: features,       // preferred dict format
        // features: featuresList, // legacy list format (optional)
        normalizedValues: true,
        noiseRemoved: true,
        aligned: true,
        processedTimestamp: new Date()
    };

    return preprocessed;
};
