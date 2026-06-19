const reportService = require('../services/reportService');
const Data = require('../models/Data');
const Analysis = require('../models/Analysis');
const path = require('path');
const fs = require('fs');

const riskZoneService = require('../services/riskZoneService');
const regionsUtil = require('../utils/regions');

exports.generateReport = async (req, res) => {
    try {
        const { dataId, mlResults, region, timeRange, format = 'pdf' } = req.body;

        // 1. Data Retrieval / Context Preparation
        let dataRecord;

        if (dataId) {
            dataRecord = await Data.findById(dataId);
            if (!dataRecord) {
                return res.status(404).json({ message: 'Data record not found' });
            }
        } else if (region) {
            // Transient Data from dashboard (Real telemetry)
            dataRecord = {
                region: region,
                timeRange: {
                    start: new Date((timeRange && timeRange.start) ? timeRange.start : new Date().setFullYear(new Date().getFullYear() - 1)),
                    end: new Date((timeRange && timeRange.end) ? timeRange.end : new Date())
                },
                ...(req.body.data || {}) // Merges preprocessedData.summary from dashboard
            };

            // Fallback for mock if dashboard didn't provide preprocessedData
            if (!dataRecord.preprocessedData) {
                dataRecord.preprocessedData = {
                    summary: {
                        avgTemp: 25.5,
                        totalRain: 120.4,
                        avgHumidity: 60.2,
                        ndvi: 0.5,
                        lst: 30.0
                    }
                };
            }
        } else {
            return res.status(400).json({ message: 'DataID or Region required for report' });
        }

        // 2. Results Preparation
        // Use provided results or fallback to stored results, or default to empty
        let results = mlResults || (dataRecord.metadata ? dataRecord.metadata.mlResults : {});
        // Ensure strictly deep cloned/parsed
        results = JSON.parse(JSON.stringify(results));

        // 3. Inject Risk Zone Stats (Parity with Dashboard/PDF)
        if (results && Object.keys(results).length > 0) {
            try {
                const regionId = region || dataRecord.region;
                if (regionId && regionsUtil.validateRegion(regionId)) {
                    const regionData = regionsUtil.getRegionById(regionId);
                    const rf = results.randomForest || results;
                    const riskScore = rf.risk_score;

                    if (riskScore !== undefined) {
                        const cnnScore = (results.cnn && results.cnn.forest_loss_probability) || riskScore;
                        const zones = riskZoneService.generateZones(regionData.bbox, {
                            forest_loss_risk: riskScore,
                            cnn_risk_score: cnnScore
                        });

                        if (zones.length > 0) {
                            const highRisk = zones.filter(z => z.risk_score > 0.6).length;
                            const medRisk = zones.filter(z => z.risk_score > 0.3 && z.risk_score <= 0.6).length;
                            const lowRisk = zones.length - highRisk - medRisk;

                            results.risk_zone_stats = {
                                total_zones: zones.length,
                                high_risk_count: highRisk,
                                medium_risk_count: medRisk,
                                low_risk_count: lowRisk,
                                high_risk_pct: ((highRisk / zones.length) * 100).toFixed(1),
                                avg_risk: (zones.reduce((sum, z) => sum + z.risk_score, 0) / zones.length).toFixed(2)
                            };
                        }
                    }
                }
            } catch (statErr) {
                console.warn("Report Stat Generation Failed:", statErr.message);
            }
        }

        // 4. Generate Response based on Format
        let reportDetails;
        if (format === 'csv') {
            // For single-region CSV, we pass an array with enriched record
            // We ensure it is a plain object so spreading works with the parser
            const dataToExport = [{
                region: dataRecord.region,
                fetchTimestamp: dataRecord.fetchTimestamp || new Date(),
                sourceApi: dataRecord.sourceApi || 'In-Memory Context',
                preprocessedData: dataRecord.preprocessedData,
                metadata: { mlResults: results }
            }];
            reportDetails = await reportService.generateCSVExport(dataToExport);
        } else {
            // Default to PDF
            reportDetails = await reportService.generatePDFReport(dataRecord, results);
        }

        const { filename } = reportDetails;

        res.json({
            success: true,
            message: `${format.toUpperCase()} report generated successfully`,
            downloadUrl: `/api/v1/reports/download/${filename}`
        });

    } catch (err) {
        console.error("REPORT GEN ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.exportData = async (req, res) => {
    try {
        // Fetch last 50 data records
        const dataRecords = await Data.find().sort({ fetchTimestamp: -1 }).limit(50).lean();

        // Enrich each record with latest Analysis results if available
        const enrichedList = await Promise.all(dataRecords.map(async (record) => {
            const regionKey = record.region.toLowerCase().trim().replace(/\s+/g, '-');
            const analysis = await Analysis.findOne({ regionKey });

            if (analysis) {
                return {
                    ...record,
                    metadata: {
                        ...record.metadata,
                        mlResults: {
                            randomForest: {
                                risk_score: analysis.riskScore,
                                confidence: analysis.confidence,
                                recommended_tree: analysis.recommendations?.[0]?.replace('Plant ', '') || 'N/A',
                                reforestation_recommendations: analysis.recommendations
                            }
                        }
                    }
                };
            }
            return record;
        }));

        const { filename } = await reportService.generateCSVExport(enrichedList);

        res.json({
            success: true,
            message: 'Bulk Data Export generated',
            downloadUrl: `/api/v1/reports/download/${filename}`
        });
    } catch (err) {
        console.error("BULK EXPORT ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.downloadFile = (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ message: 'File not found' });
    }
};
