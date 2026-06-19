const axios = require('axios');
const Data = require('../models/Data');
const regionsUtil = require('../utils/regions');
const logger = require('../utils/logger');

/**
 * NASA POWER Climate Pipeline Service
 */
exports.fetchAndProcessClimateData = async (regionId, startDate, endDate) => {
    try {
        const region = regionsUtil.getRegionById(regionId);
        if (!region) {
            throw new Error(`Invalid region: ${regionId}`);
        }

        const [minLat, minLon, maxLat, maxLon] = region.bbox;
        const lat = (minLat + maxLat) / 2;
        const lon = (minLon + maxLon) / 2;

        const baseUrl = process.env.NASA_POWER_BASE_URL || 'https://power.larc.nasa.gov/api/temporal/daily/point';

        // Format dates: YYYYMMDD
        const start = startDate.replace(/-/g, '');
        const end = endDate.replace(/-/g, '');

        const params = {
            parameters: 'T2M,PRECTOTCORR,RH2M',
            community: 'SB',
            longitude: lon,
            latitude: lat,
            start: start,
            end: end,
            format: 'JSON'
        };

        logger.info(`Fetching NASA POWER data for ${regionId} (${lat}, ${lon}) from ${startDate} to ${endDate}...`);

        const response = await axios.get(baseUrl, { params });
        const rawData = response.data;

        if (!rawData || !rawData.properties || !rawData.properties.parameter) {
            throw new Error('Invalid response from NASA POWER API');
        }

        const parameters = rawData.properties.parameter;
        const dates = Object.keys(parameters.T2M);

        // Process and normalize data
        const processedData = dates.map(date => {
            const temp = parameters.T2M[date];
            const rain = parameters.PRECTOTCORR[date];
            const humidity = parameters.RH2M[date];

            return {
                date,
                temperature: temp,
                precipitation: rain,
                humidity: humidity,
                // Example normalization: Temperature mapped to 0-1 (assuming -10 to 50 range)
                normalizedTemp: (temp + 10) / 60
            };
        });

        // Store in MongoDB
        const climateRecord = new Data({
            region: regionId,
            timeRange: {
                start: new Date(startDate),
                end: new Date(endDate)
            },
            sourceApi: 'NASA POWER (Node.js Pipeline)',
            rawData: rawData,
            preprocessedData: {
                metrics: processedData,
                summary: {
                    avgTemp: processedData.reduce((acc, d) => acc + d.temperature, 0) / processedData.length,
                    totalRain: processedData.reduce((acc, d) => acc + d.precipitation, 0),
                    avgHumidity: processedData.reduce((acc, d) => acc + d.humidity, 0) / processedData.length
                }
            },
            isPreprocessed: true,
            metadata: {
                location: { lat, lon },
                engine: 'Node.js'
            }
        });

        const savedData = await climateRecord.save();
        logger.info(`Successfully stored climate data for ${regionId} with ID: ${savedData._id}`);

        return savedData;
    } catch (error) {
        logger.error(`NASA POWER Pipeline Error: ${error.message}`);
        throw error;
    }
};
