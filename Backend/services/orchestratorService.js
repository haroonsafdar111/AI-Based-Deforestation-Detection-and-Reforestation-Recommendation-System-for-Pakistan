const climatePipeline = require('./nasa_power_climate');
const environmentalPipeline = require('./earthdata_environmental');
const forestPipeline = require('./gfw_forest_data');
const forestTrendService = require('./forestTrendService');
const geospatialService = require('./geospatialService');
const regionsUtil = require('../utils/regions');
const Data = require('../models/Data');
const logger = require('../utils/logger');

/**
 * Unified Data Pipeline Orchestrator Service
 * Coordinates climate, environmental, and forest data pipelines.
 */
exports.runUnifiedPipeline = async (regionId, timeRange) => {
    try {
        const startDate = timeRange.start;
        const endDate = timeRange.end;
        const year = new Date(startDate).getFullYear();

        logger.info(`Starting Unified Data Pipeline for ${regionId} (${startDate} to ${endDate})...`);

        const region = regionsUtil.getRegionById(regionId);
        const [minLat, minLon, maxLat, maxLon] = region.bbox;
        const lat = (minLat + maxLat) / 2;
        const lon = (minLon + maxLon) / 2;

        // Trigger all pipelines concurrently (Performance: parallel elevation fetch)
        const [climateResults, environmentalResults, forestResults, trendResults, soilType, elevation] = await Promise.all([
            climatePipeline.fetchAndProcessClimateData(regionId, startDate, endDate),
            environmentalPipeline.fetchAndProcessEnvironmentalData(regionId, timeRange),
            forestPipeline.fetchAndProcessForestData(regionId, year),
            forestTrendService.analyzeForestTrend(regionId),
            geospatialService.fetchSoilType(lat, lon, 500), // Default elevation for soil check to avoid blocking
            geospatialService.fetchElevation(lat, lon)
        ]);

        // Synthesize and align results
        const synthesizedData = {
            regionId,
            timeRange,
            synchronizedAt: new Date(),
            datasets: {
                climate: climateResults.preprocessedData,
                environmental: environmentalResults.preprocessedData,
                forest: forestResults.preprocessedData,
                trends: trendResults
            },
            status: 'Synchronized'
        };

        // Persist to MongoDB as a Unified Data Record
        const unifiedRecord = new Data({
            region: regionId,
            timeRange: { start: new Date(startDate), end: new Date(endDate) },
            sourceApi: 'Unified Node Pipeline (Real-Time)',
            rawData: synthesizedData,
            preprocessedData: {
                summary: {
                    ...climateResults.preprocessedData.summary,
                    ...environmentalResults.preprocessedData.metrics,
                    ...forestResults.preprocessedData.summary, // Include forest summary
                    loss_ha: forestResults.preprocessedData.summary?.totalLossHa || 0 // Map for frontend compatibility
                },
                features: {
                    ...environmentalResults.preprocessedData.metrics,
                    ...forestResults.preprocessedData.features,
                    Air_Temp: climateResults.preprocessedData.summary.avgTemp,
                    Rainfall: climateResults.preprocessedData.summary.totalRain,
                    Humidity: climateResults.preprocessedData.summary.avgHumidity,
                    trendFactor: trendResults.trend_factor,
                    Elevation: elevation,
                    Soil_Type: soilType
                },
                forest_trends: trendResults
            },
            isPreprocessed: true,
            metadata: {
                executedAt: new Date(),
                status: 'Verified Real Data'
            }
        });

        const savedRecord = await unifiedRecord.save();
        logger.info(`Unified Pipeline sync and save complete for ${regionId}. Record ID: ${savedRecord._id}`);

        return savedRecord;
    } catch (error) {
        logger.error(`Unified Pipeline Orchestration Error: ${error.message}`);
        throw error;
    }
};
