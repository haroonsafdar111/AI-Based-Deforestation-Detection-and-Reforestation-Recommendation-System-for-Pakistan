const Data = require('../models/Data');
const riskZoneService = require('../services/riskZoneService');
const mlService = require('../services/mlService');
const regionsUtil = require('../utils/regions');
const preprocessingService = require('../services/preprocessingService');
const pipelineService = require('../services/pipelineService');

exports.generateRiskZones = async (req, res) => {
    const startTime = Date.now();
    const measureMs = () => `${Date.now() - startTime}ms`;

    // TEMPORARY DEBUG LOGGING
    console.log(`[generateRiskZones] Start: Auth Audit 🔍 (time elapsed: ${measureMs()})`);
    console.log("- User ID:", req.user ? req.user.id : "None (Unauthorized)");
    console.log("- User Role:", req.user ? req.user.role : "None");
    console.log("- Token Present:", !!req.headers.authorization);

    try {
        const { region } = req.body;

        // 1. Validate Region
        if (!region || !regionsUtil.validateRegion(region)) {
            console.log(`[generateRiskZones] Validation failed in ${measureMs()}`);
            return res.status(400).json({ success: false, message: 'Invalid or missing region.' });
        }

        // 🎯 Anti-Gravity: Block analysis for Pakistan national level per user request
        if (region === 'Pakistan') {
            console.log(`[generateRiskZones] Blocking analysis for 'Pakistan' (Using national mock metrics only) at ${measureMs()}`);
            return res.status(200).json({
                success: true,
                zones: [], // Dashboard uses its own mock data for Pakistan
                isMock: true
            });
        }

        const regionData = regionsUtil.getRegionById(region);
        console.log(`[generateRiskZones] Region metadata resolved in ${measureMs()}`);

        // 2. Resolve Data Record (Auto-Fetch if missing)
        console.log(`[generateRiskZones] Step 2: Resolving data record for ${region}...`);
        const dataLookupStart = Date.now();
        let dataRecord = await Data.findOne({ region: region }).sort({ createdAt: -1 });
        console.log(`[PERF] Data lookup: ${Date.now() - dataLookupStart} ms`);

        if (!dataRecord) {
            console.log(`[generateRiskZones] Auto-fetching data for ${region} (Missing in DB) at ${measureMs()}...`);
            const startDate = '2023-01-01'; // Default baseline
            const endDate = '2023-01-31';

            try {
                const pipelineResult = await pipelineService.runDataPipeline(region, startDate, endDate);

                if (pipelineResult.error || pipelineResult.status === 'failed') {
                    console.log(`[generateRiskZones] Data pipeline execution failed in ${measureMs()}`);
                    return res.status(422).json({
                        success: false,
                        message: `No training data available for this region. Reasons: ${pipelineResult.error || 'Unknown Pipeline Failure'}`
                    });
                }

                dataRecord = new Data({
                    region,
                    timeRange: { start: new Date(startDate), end: new Date(endDate) },
                    sourceApi: 'Unified Python Pipeline',
                    rawData: pipelineResult,
                    metadata: { executedAt: new Date(), pipelineStatus: pipelineResult.status }
                });
                await dataRecord.save();
                console.log(`[generateRiskZones] Data for ${region} successfully fetched and saved in ${measureMs()}`);
            } catch (fetchErr) {
                console.log(`[generateRiskZones] Error auto-fetching data in ${measureMs()}:`, fetchErr.message);
                return res.status(500).json({
                    success: false,
                    message: `Failed to auto-fetch training data for ${region}.`,
                    error: fetchErr.message
                });
            }
        } else {
            console.log(`[generateRiskZones] Stored data record found in ${measureMs()}`);
        }

        // 3. Ensure Preprocessing (Required for ML)
        console.log(`[generateRiskZones] Step 3: Ensuring preprocessing at ${measureMs()}...`);
        const preprocessValidationStart = Date.now();
        if (!dataRecord.isPreprocessed || !dataRecord.preprocessedData) {
            try {
                const preprocessed = await preprocessingService.preprocessData(dataRecord.rawData);
                dataRecord.preprocessedData = preprocessed;
                dataRecord.isPreprocessed = true;
                await dataRecord.save();
                console.log(`[generateRiskZones] Data preprocessed and saved in ${measureMs()}`);
            } catch (pError) {
                console.log(`[generateRiskZones] Preprocessing failed in ${measureMs()}:`, pError.message);
                return res.status(500).json({ success: false, message: 'Preprocessing failed.', error: pError.message });
            }
        } else {
            console.log(`[generateRiskZones] Data already preprocessed at ${measureMs()}`);
        }
        console.log(`[PERF] Preprocessing validation: ${Date.now() - preprocessValidationStart} ms`);

        // 3b. Construction of RF input payload
        const payloadStart = Date.now();
        const config = { deforestationRisk: { high: 0.7, medium: 0.4 } }; 
        const inputPayload = { data: dataRecord.preprocessedData, thresholds: config.deforestationRisk };
        console.log(`[PERF] Payload build: ${Date.now() - payloadStart} ms`);

        // 4. Run ML Inference
        let rfResult, cnnResult;

        console.log(`[generateRiskZones] Step 4a: Running Random Forest inference at ${measureMs()}...`);
        const rfReqStart = Date.now();
        console.log(`[PERF] RF request started`);
        try {
            // Run Random Forest (Tabular Risk)
            rfResult = await mlService.runRandomForest(dataRecord.preprocessedData);
            console.log(`[PERF] RF response received after ${Date.now() - rfReqStart} ms`);
            
            const rfParseStart = Date.now();
            if (!rfResult || typeof rfResult.risk_score === 'undefined') {
                throw new Error("Invalid RF model response structure");
            }
            console.log(`[PERF] RF result parsing: ${Date.now() - rfParseStart} ms`);
        } catch (mlErr) {
            console.error(`[generateRiskZones] RF Inference Failed in ${measureMs()}:`, mlErr);
            return res.status(520).json({ 
                success: false, 
                message: 'ML Service: Random Forest inference failed.',
                error: mlErr.message 
            });
        }

        console.log(`[generateRiskZones] Step 4b: Running CNN inference at ${measureMs()}...`);
        try {
            // Run CNN (Visual Risk) Only if Image Exists
            if (dataRecord.preprocessedData.image_path) {
                console.log(`[generateRiskZones] Image path found: ${dataRecord.preprocessedData.image_path}. Calling CNN inference...`);
                cnnResult = await mlService.runCNN(dataRecord.preprocessedData);
                console.log(`[generateRiskZones] CNN inference completed in ${measureMs()}`);
                if (!cnnResult || cnnResult.forest_loss_probability === undefined) {
                    throw new Error("CNN results missing probability field");
                }
            } else {
                // Silent Fallback if no image (Expected behavior for region queries)
                // Use RF Risk as proxy
                console.log(`[generateRiskZones] No image path found. Skipping CNN call and using RF risk proxy in ${measureMs()}`);
                cnnResult = { 
                    forest_loss_probability: rfResult.risk_score,
                    fallback: true
                };
            }
        } catch (mlErr) {
            console.warn(`[generateRiskZones] CNN Inference Failed in ${measureMs()}, using proxy:`, mlErr.message);
            cnnResult = { 
                forest_loss_probability: rfResult.risk_score || 0.5,
                fallback: true,
                error: mlErr.message
            };
        }

        // 5. Extract Scores
        // RF Script usually returns 'risk_score'
        // CNN Script returns 'forest_loss_probability'
        console.log(`[generateRiskZones] Step 5: Extracting scores at ${measureMs()}...`);
        const forest_loss_risk = rfResult.risk_score;
        const cnn_risk_score = cnnResult.forest_loss_probability; // Defined in satellite_analysis.py

        if (forest_loss_risk === undefined || cnn_risk_score === undefined) {
            console.log(`[generateRiskZones] Extracted scores invalid: RF=${forest_loss_risk}, CNN=${cnn_risk_score} at ${measureMs()}`);
            return res.status(422).json({ success: false, message: 'Incomplete ML outputs.', debug_rf: rfResult, debug_cnn: cnnResult });
        }

        // 6. Generate Risk Zones with adaptive thresholding
        console.log(`[generateRiskZones] Step 6: Generating risk zones at ${measureMs()}...`);
        let zones = [];
        const zoneStart = Date.now();
        try {
            zones = riskZoneService.generateZones(regionData.bbox, {
                forest_loss_risk,
                cnn_risk_score
            }, rfResult.risk_level);
            console.log(`[PERF] Zone generation: ${Date.now() - zoneStart} ms`);
            console.log(`[generateRiskZones] Risk zones generated successfully in ${measureMs()}. Zone count: ${zones.length}`);
        } catch (svcErr) {
            console.error(`[generateRiskZones] RiskZoneService CRASHED in ${measureMs()}:`, svcErr.message);
            return res.status(500).json({
                success: false,
                message: 'Risk zone generation service failure',
                error: svcErr.message,
                stack: svcErr.stack
            });
        }

        // 7. Success Response
        console.log(`[generateRiskZones] Success: Sending response at ${measureMs()}...`);
        res.status(200).json({
            success: true,
            region: region,
            geometry: regionData.geojson, // Added geometry field
            generatedAt: new Date(),
            zone_count: zones.length,
            zones: zones
        });

    } catch (error) {
        console.error(`[generateRiskZones] Error in generateRiskZones in ${measureMs()}:`, error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};
