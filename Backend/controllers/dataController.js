const Data = require('../models/Data');
const pipelineService = require('../services/pipelineService');
const orchestratorService = require('../services/orchestratorService');
const regionsUtil = require('../utils/regions');

const normalizeDashboardData = (record) => {
    const pre = record.preprocessedData || {};
    const summary = pre.summary || {};
    const features = pre.features || {};
    const trendData = pre.forest_trends || record.rawData?.datasets?.trends || {};
    const yearlyTrends = trendData.yearly_trends || trendData.trends || [];
    const startYear = record.timeRange?.start ? new Date(record.timeRange.start).getFullYear() : new Date().getFullYear() - 3;
    const endYear = record.timeRange?.end ? new Date(record.timeRange.end).getFullYear() : new Date().getFullYear();
    const years = yearlyTrends.length > 0 ? `${yearlyTrends[0].year} to ${yearlyTrends[yearlyTrends.length - 1].year}` : `${startYear} to ${endYear}`;

    const totalLoss = Number(summary.loss_ha || summary.totalLossHa || summary.total_loss || summary.totalLoss || 0);
    const totalLossLabel = totalLoss ? `${totalLoss.toFixed(1)} Mha` : 'N/A';
    const trendFactor = Number(features.trendFactor || features.trend_factor || 0);
    const percentLabel = trendFactor ? `${(trendFactor * 10).toFixed(1)}%` : 'N/A';
    const co2Label = summary.co2 || summary.CO2 || (totalLoss ? `${(totalLoss * 0.42).toFixed(1)} Gt` : 'N/A');
    const primaryTotal = totalLoss ? Number((totalLoss * 0.4).toFixed(1)) : 0;
    const primaryTotalLabel = primaryTotal ? `${primaryTotal.toFixed(1)} Mha` : 'N/A';
    const primaryPercentLabel = totalLoss ? `${((primaryTotal / totalLoss) * 100).toFixed(0)}%` : 'N/A';

    return {
        summary: {
            year: record.updatedAt ? new Date(record.updatedAt).getFullYear() : startYear,
            area: (features.elevation ?? features.Elevation) ? `${((features.elevation ?? features.Elevation) / 100).toFixed(1)} Gha` : '3.5 Gha',
            percent: (features.ndvi ?? features.NDVI) ? `${((features.ndvi ?? features.NDVI) * 100).toFixed(0)}%` : 'N/A',
            loss: totalLossLabel,
            co2: co2Label
        },
        annualLoss: {
            years,
            total: totalLossLabel,
            percent: percentLabel,
            co2: co2Label,
            chart: yearlyTrends.length > 0 ? yearlyTrends.map((d) => d.loss) : []
        },
        primaryLoss: {
            years,
            total: primaryTotalLabel,
            percent: primaryPercentLabel,
            decrease: primaryTotalLabel,
            chart: yearlyTrends.length > 0 ? yearlyTrends.map((d) => Number((d.loss * 0.4).toFixed(2))) : []
        },
        forestChange: {
            naturalLoss: {
                years,
                naturalPercent: primaryPercentLabel,
                totalLoss: primaryTotalLabel,
                co2: co2Label,
                chart: yearlyTrends.length > 0 ? yearlyTrends.map((d) => Number((d.loss * 0.4).toFixed(2))) : []
            }
        }
    };
};

exports.fetchAndStoreData = async (req, res) => {
    try {
        const { region, timeRange } = req.body;
        const startDate = timeRange?.start || '2023-01-01';
        const endDate = timeRange?.end || '2023-01-31';

        if (!region || !regionsUtil.validateRegion(region)) {
            return res.status(400).json({ message: 'Invalid or missing region selection' });
        }

        // Trigger Python Unified Pipeline
        console.log(`Triggering Python pipeline for ${region}...`);
        const pipelineResult = await pipelineService.runDataPipeline(region, startDate, endDate);

        const newDataset = new Data({
            region,
            timeRange: { start: new Date(startDate), end: new Date(endDate) },
            sourceApi: 'Unified Python Pipeline',
            rawData: pipelineResult,
            metadata: {
                executedAt: new Date(),
                pipelineStatus: pipelineResult.status
            }
        });

        const savedData = await newDataset.save();

        res.json({
            success: true,
            message: 'Data fetched and stored successfully via Python pipeline',
            data: savedData
        });
    } catch (err) {
        console.error('Pipeline Execution Error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.triggerUnifiedPipeline = async (req, res) => {
    try {
        const { region, timeRange } = req.body;
        const startDate = timeRange?.start || '2023-01-01';
        const endDate = timeRange?.end || '2023-01-31';

        if (!region || !regionsUtil.validateRegion(region)) {
            return res.status(400).json({ message: 'Invalid or missing region selection' });
        }

        const result = await orchestratorService.runUnifiedPipeline(region, {
            start: startDate,
            end: endDate
        });

        res.json({
            success: true,
            message: 'Unified data pipeline executed successfully',
            data: result
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getStoredData = async (req, res) => {
    try {
        const data = await Data.find().sort({ fetchTimestamp: -1 });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getLatestDataByRegion = async (req, res) => {
    try {
        const { regionId } = req.params;

        // Normalize region ID using regions utility
        const region = regionsUtil.getRegionById(regionId);
        const canonicalRegionId = region ? region.id : regionId;

        // 1. Prioritize finding the latest unified record with complete preprocessed data
        let latestData = await Data.findOne({
            region: canonicalRegionId,
            sourceApi: { $regex: /unified/i },
            isPreprocessed: true,
            'preprocessedData.summary': { $exists: true },
            'preprocessedData.features': { $exists: true }
        }).sort({ createdAt: -1 });

        // 2. If no unified record is found, trigger the unified pipeline synchronously
        if (!latestData && region) {
            console.log(`[dataController] No unified record found for region ${canonicalRegionId}. Triggering unified pipeline synchronously...`);
            try {
                latestData = await orchestratorService.runUnifiedPipeline(canonicalRegionId, {
                    start: '2023-01-01',
                    end: '2023-12-31'
                });
            } catch (pipelineErr) {
                console.error(`[dataController] Synchronous unified pipeline execution failed for ${canonicalRegionId}:`, pipelineErr.message);
            }
        }

        // 3. Fallback to any latest record (even if individual) if pipeline fails or region is invalid
        if (!latestData) {
            latestData = await Data.findOne({
                region: canonicalRegionId
            }).sort({ createdAt: -1 });
        }

        if (!latestData) {
            return res.status(404).json({
                success: false,
                message: `No verified real data found for region: ${regionId}`
            });
        }

        const dashboardData = normalizeDashboardData(latestData);

        res.json({
            success: true,
            data: latestData,
            dashboardData
        });
    } catch (err) {
        console.error(`Error fetching latest data for ${req.params.regionId}:`, err);
        res.status(500).json({ message: err.message });
    }
};
