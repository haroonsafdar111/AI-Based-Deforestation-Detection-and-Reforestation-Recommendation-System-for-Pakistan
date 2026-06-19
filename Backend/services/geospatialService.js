const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Geospatial Service for fetching Elevation and Soil Type data
 */

/**
 * Fetch elevation for a given coordinate using Open-Elevation API
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<number>} elevation in meters
 */
exports.fetchElevation = async (lat, lon) => {
    try {
        const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`, {
            timeout: 5000
        });

        if (response.data && response.data.results && response.data.results[0]) {
            return response.data.results[0].elevation;
        }
        return 500; // Fallback
    } catch (error) {
        logger.warn(`Elevation API failed for (${lat}, ${lon}): ${error.message}. Using default.`);
        return 500;
    }
};

/**
 * Fetch soil data and map to categorical ID
 * @param {number} lat 
 * @param {number} lon 
 * @param {number} elevation (optional) - used for heuristic fallback
 * @returns {Promise<number>} Categorical Soil ID (1=Hilly, 2=Alluvial, 3=Arid)
 */
exports.fetchSoilType = async (lat, lon, elevation = 500) => {
    try {
        // SoilGrids V2 REST API for WRB (World Reference Base) classification
        const url = `https://rest.isric.org/soilgrids/v2.0/classification/query?lon=${lon}&lat=${lat}`;
        const response = await axios.get(url, { timeout: 3000 }); // Faster timeout

        if (response.data && response.data.most_probable_class) {
            const soilClass = response.data.most_probable_class.toLowerCase();
            return this.mapSoilClassToId(soilClass);
        }
    } catch (error) {
        logger.warn(`SoilGrids API failed for (${lat}, ${lon}). Using elevation-based heuristic.`);
    }

    // Heuristic Fallback based on elevation
    if (elevation > 1000) return 1; // Hilly/Forest (Pine/Deodar zones)
    if (elevation < 400) return 3;  // Arid/Sandy (Babul/Desert zones)
    return 2; // Alluvial/Fertile (Plains/Shisham zones)
};

/**
 * Map ISRIC WRB classes to our model's IDs
 * 1 = Hilly/Forest, 2 = Alluvial/Fertile, 3 = Arid/Sandy
 */
exports.mapSoilClassToId = (soilClass) => {
    const hillyClasses = ['leptosols', 'regosols', 'podzols', 'cambisols', 'rocky', 'loamy'];
    const fertileClasses = ['fluvisols', 'luvisols', 'phaeozems', 'chernozems', 'nitisols', 'alluvial', 'sandy loam'];
    const aridClasses = ['arenosols', 'calcisols', 'gypsisols', 'solonchaks', 'solonetz', 'durisols', 'arid', 'desert', 'sandy', 'saline'];

    const cleanClass = soilClass.toLowerCase();
    if (hillyClasses.some(c => cleanClass.includes(c))) return 1;
    if (fertileClasses.some(c => cleanClass.includes(c))) return 2;
    if (aridClasses.some(c => cleanClass.includes(c))) return 3;

    return 2; // Default to Alluvial if unknown
};
