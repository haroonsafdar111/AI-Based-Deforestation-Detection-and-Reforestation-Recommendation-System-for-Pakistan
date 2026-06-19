const BASE_URLS = {
    BACKEND: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
};

import { regionCoordinates } from '../data/regionCoordinates';

/**
 * 1. REGION SELECTOR API
 * Handles fetching available districts and specific metrics for a selected region.
 */
export const fetchRegions = async () => {
    try {
        // Simulating API behavior until endpoints are ready
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir']);
            }, 500);
        });
    } catch (error) {
        console.error('Error fetching regions:', error);
        throw error;
    }
};

export const fetchRegionData = async (regionId) => {
    try {
        const { fetchWithAuth } = await import('./authService');
        const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/data/region/${encodeURIComponent(regionId)}`);

        if (response.status === 404) {
            console.warn(`No verified data for ${regionId}, dashboard will show fallback/mocks.`);
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch region data: ${response.statusText}`);
        }

        const data = await response.json();
        const record = data.data;
        const backendDashboardData = data.dashboardData || null;

        // Prefer exact backend-provided dashboard fields when available
        if (backendDashboardData) {
            return backendDashboardData;
        }

        // Robust fallback logic: Support records regardless of whether they are 'preprocessed' or just 'raw'
        const pre = record.preprocessedData || record.rawData || {};
        const feat = pre.features || pre.environmental_data?.metrics || pre.metrics || {};
        const sum = pre.summary || pre.climate_data?.summary || {};
        const trends = sum.yearlyTrends || [];

        // Formulate year string from available metadata
        const startYear = record.timeRange?.start ? new Date(record.timeRange.start).getFullYear() : (pre.time_range?.start?.split('-')[0] || '2023');
        const endYear = record.timeRange?.end ? new Date(record.timeRange.end).getFullYear() : (pre.time_range?.end?.split('-')[0] || '2024');

        const totalLossMha = sum.loss_ha ?? sum.totalLossHa ?? sum.total_loss ?? sum.totalLoss ?? 0;
        const annualTrendFactor = feat.trendFactor ?? feat.trend_factor ?? sum.trendFactor ?? (trends.length > 1 ? (trends[trends.length - 1].loss / (trends[0].loss || 1)) : null);
        const primaryTotalMha = totalLossMha ? Number((totalLossMha * 0.4).toFixed(1)) : 0;
        const annualPercent = annualTrendFactor ? `${(Number(annualTrendFactor) * 10).toFixed(1)}%` : "N/A";
        const primaryPercent = (totalLossMha && primaryTotalMha) ? `${((primaryTotalMha / totalLossMha) * 100).toFixed(0)}%` : "N/A";
        const co2Estimate = totalLossMha ? `${(totalLossMha * 0.42).toFixed(1)} Gt` : "N/A";

        // Transform record to the complex Dashboard structure
        return {
            summary: {
                year: record.updatedAt ? new Date(record.updatedAt).getFullYear() : startYear,
                area: (feat.elevation ?? feat.Elevation) > 0 ? `${((feat.elevation ?? feat.Elevation) / 100).toFixed(1)} Gha` : "3.5 Gha",
                percent: (feat.ndvi ?? feat.NDVI) ? `${((feat.ndvi ?? feat.NDVI) * 100).toFixed(0)}%` : "N/A",
                loss: totalLossMha ? `${totalLossMha.toFixed(1)} Mha` : "N/A",
                co2: (feat.rainfall ?? feat.Rainfall) ? `${((feat.rainfall ?? feat.Rainfall) / 10).toFixed(1)} Gt` : co2Estimate
            },
            annualLoss: {
                years: trends.length > 0 ?
                    `${trends[0].year} to ${trends[trends.length - 1].year}` :
                    `${startYear} to ${endYear}`,
                total: totalLossMha ? `${totalLossMha.toFixed(1)} Mha` : "N/A",
                percent: annualPercent,
                co2: co2Estimate,
                chart: trends.length > 0 ? trends.map(d => d.loss) : []
            },
            // Metadata for display
            isRealData: true,
            synchronizedAt: record.updatedAt,
            primaryLoss: {
                years: trends.length > 0 ? `${trends[0].year} to ${trends[trends.length - 1].year}` : `${startYear} to ${endYear}`,
                total: totalLossMha ? `${primaryTotalMha.toFixed(1)} Mha` : "N/A", // Simulated primary forest as 40% of total
                percent: primaryPercent,
                decrease: totalLossMha ? `${primaryTotalMha.toFixed(1)} Mha` : "N/A",
                chart: trends.length > 0 ? trends.map(d => d.loss * 0.4) : []
            },
            // Metadata for specific environmental features
            metrics: {
                ndvi: feat.ndvi ?? feat.NDVI ?? null,
                evi: feat.evi ?? feat.EVI ?? null,
                lst: feat.lst ?? feat.LST ?? null,
                soilMoisture: feat.soilMoisture ?? feat.Soil_Moisture ?? feat.SoilMoisture ?? null,
                temperature: feat.temperature ?? feat.Air_Temp ?? feat.Temperature ?? feat.AvgTemp ?? null,
                rainfall: feat.rainfall ?? feat.Rainfall ?? feat.TotalRain ?? null,
                elevation: feat.elevation ?? feat.Elevation ?? null,
                humidity: feat.humidity ?? feat.Humidity ?? null
            }
        };

    } catch (error) {
        console.error(`Error fetching data for region ${regionId}:`, error);
        throw error;
    }
};

/**
 * Helper to generate map particles from hectare data
 */
const generateForestParticles = (regionId, lossHa, trends = []) => {
    const coords = regionCoordinates[regionId] || [33.6844, 73.0479]; // Default to Islamabad
    const particles = [];

    // Base intensity: 1 particle per 10k hectares, min 5, max 30 for performance
    const count = Math.min(30, Math.max(5, Math.ceil(lossHa / 200)));

    // Generate particles for the "Current" state
    for (let i = 0; i < count; i++) {
        particles.push({
            lat: coords[0] + (Math.random() - 0.5) * 0.15,
            lng: coords[1] + (Math.random() - 0.5) * 0.15,
            type: 'loss',
            year: 2024,
            density: 30 + Math.random() * 40
        });
    }

    // Add historical context from trends if available
    trends.forEach(trend => {
        const trendCount = Math.min(10, Math.ceil(trend.loss / 500));
        for (let i = 0; i < trendCount; i++) {
            particles.push({
                lat: coords[0] + (Math.random() - 0.5) * 0.2,
                lng: coords[1] + (Math.random() - 0.5) * 0.2,
                type: 'loss',
                year: trend.year,
                density: 20 + Math.random() * 30
            });
        }
    });

    return particles;
};

/**
 * 1.b MAP FOREST DATA API
 * Fetches data specifically formatted for the Map's Forest Loss layer.
 */
export const fetchMapForestData = async (regionId) => {
    try {
        const { fetchWithAuth } = await import('./authService');
        const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/data/region/${encodeURIComponent(regionId)}`);

        if (!response.ok) return null;

        const data = await response.json();
        const record = data.data;
        const pre = record.preprocessedData || record.rawData || {};
        const sum = pre.summary || pre.climate_data?.summary || {};
        const lossHa = sum.loss_ha || 0;
        const trends = sum.yearlyTrends || [];

        return generateForestParticles(regionId, lossHa, trends);
    } catch (error) {
        console.error('Error fetching map forest data:', error);
        return null;
    }
};

/**
 * 2. DOWNLOAD API
 * Handles fetching the Excel report from the backend.
 */
export const fetchForestLossExcel = async (regionId, yearRange) => {
    try {
        // Simulating backend file generation
        return new Promise((resolve) => {
            setTimeout(() => {
                // In a real app, this would be a Blob from the server.
                resolve(null);
            }, 1000);
        });
    } catch (error) {
        console.error('Error in Excel download API:', error);
        throw error;
    }
};

/**
 * 3. LOCATION SEARCH API
 * Handles searching for locations by name or coordinates.
 */
export const searchLocation = async (query) => {
    try {
        if (!query) return [];

        // Normalize the query by removing common suffixes and extra whitespace
        const cleanQuery = query.toLowerCase()
            .replace(/,\s*pakistan$/i, '')
            .replace(/\s+valley/i, '')
            .replace(/\s+forest\s+belt/i, '')
            .trim();

        const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);

        // Search through regionCoordinates keys for matches
        const allKeys = Object.keys(regionCoordinates);

        // 1. Try Exact/Substring match on IDs
        let matchedKeys = allKeys.filter(key =>
            key.toLowerCase() === cleanQuery ||
            key.toLowerCase().includes(cleanQuery)
        );

        // 2. If no substring matches, try word-based overlap
        if (matchedKeys.length === 0 && words.length > 0) {
            matchedKeys = allKeys.filter(key => {
                const keyLower = key.toLowerCase();
                return words.every(word => keyLower.includes(word));
            });
        }

        const matches = matchedKeys.map(key => ({
            id: key,
            name: key + (key.includes('Pakistan') ? '' : ', Pakistan'),
            coords: [regionCoordinates[key][0], regionCoordinates[key][1]]
        }));

        return new Promise((resolve) => {
            setTimeout(() => {
                if (matches.length > 0) {
                    resolve(matches.slice(0, 5)); // Limit to top 5 matches
                } else {
                    // Fallback to defaults if no match found
                    resolve([
                        { name: 'Lahore, Pakistan', coords: [31.5204, 74.3587] },
                        { name: 'Islamabad, Pakistan', coords: [33.6844, 73.0479] }
                    ]);
                }
            }, 400);
        });
    } catch (error) {
        console.error('Error searching location:', error);
        throw error;
    }
};

/**
 * 4. POINT DETAILS API
 * Handles extracting details for a specific coordinate point.
 */
export const extractPointDetails = async (lat, lng) => {
    try {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    lat,
                    lng,
                    forestCover: '45%',
                    riskScore: 0.76,
                    description: 'Moderate forest density with high risk of loss.'
                });
            }, 500);
        });
    } catch (error) {
        console.error('Error extract point details:', error);
        throw error;
    }
};
