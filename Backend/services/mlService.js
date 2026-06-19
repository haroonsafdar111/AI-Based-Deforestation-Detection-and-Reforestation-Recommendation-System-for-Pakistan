const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const Data = require('../models/Data');
const Analysis = require('../models/Analysis');
const Config = require('../models/Config');
const regionsUtil = require('../utils/regions');

/**
 * Execute ML inference via FastAPI service
 * @param {string} endpoint - API endpoint ('rf' or 'cnn')
 * @param {object} inputData - Data to pass to the service
 * @returns {Promise<object>} - Parsed JSON result from Python service
 */
const callMLService = async (endpoint, inputData) => {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    try {
        // Ensure proper format for FastAPI: { data: {...}, thresholds: {...} }
        // The ML service expects the exact structure we use internally
        const payload = (inputData.data !== undefined) ? inputData : { data: inputData };

        console.log(`[ML Service] Calling ${endpoint} endpoint at ${ML_SERVICE_URL}/predict/${endpoint}`);

        const start = Date.now();

        const response = await axios.post(`${ML_SERVICE_URL}/predict/${endpoint}`,
            payload,
            { timeout: 30000 } // 30 second timeout
        );

        console.log(
            `[ML Service] ${endpoint} request completed in ${Date.now() - start} ms`
        );

        console.log(`[ML Service] ${endpoint} prediction successful`);
        return response.data;
    } catch (error) {
        console.error(`[ML Service] Call failed for ${endpoint}:`, error?.response?.status, error?.message);
        if (error?.response?.data) {
            console.error(`[ML Service] Error details:`, JSON.stringify(error.response.data, null, 2));
        }

        if (process.env.ML_SPAWN_FALLBACK === 'false') {
            throw new Error(`ML microservice call failed and spawning fallback is disabled: ${error.message}`);
        }

        // Fallback to old spawn method if service is unavailable
        console.log(`[ML Service] Falling back to spawn method for ${endpoint}`);
        return await runPythonML(endpoint === 'rf' ? 'risk_analysis.py' : 'satellite_analysis.py', inputData);
    }
};

/**
 * Execute a Python script for ML inference
 * @param {string} scriptName - Name of the script in the ml/ directory
 * @param {object} inputData - Data to pass to the script as JSON
 * @returns {Promise<object>} - Parsed JSON result from Python
 */
const runPythonML = (scriptName, inputData) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../ML Model', scriptName);
        console.log(`[Python ML] Executing script: ${scriptPath}`);

        // Use the uv virtual environment Python executable if it exists
        const venvSubdir = process.platform === 'win32' ? 'Scripts' : 'bin';
        const venvExe = process.platform === 'win32' ? 'python.exe' : 'python';
        const venvPythonPath = path.join(__dirname, '../../ML Service/.venv', venvSubdir, venvExe);
        const fs = require('fs');

        let pythonCommand;
        let pythonArgs;

        if (process.platform === 'win32') {
            if (fs.existsSync(venvPythonPath)) {
                pythonCommand = venvPythonPath;
                pythonArgs = ['-u', scriptPath];
            } else {
                // Fallback to global py if venv is not found
                pythonCommand = 'py';
                pythonArgs = ['-3', '-u', scriptPath];
            }
        } else {
            if (fs.existsSync(venvPythonPath)) {
                pythonCommand = venvPythonPath;
                pythonArgs = ['-u', scriptPath];
            } else {
                pythonCommand = 'python3';
                pythonArgs = ['-u', scriptPath];
            }
        }

        const pythonProcess = spawn(pythonCommand, pythonArgs, {
            cwd: path.join(__dirname, '../../ML Model'),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        if (inputData) {
            try {
                const stdinData = JSON.stringify(inputData);
                pythonProcess.stdin.write(stdinData + '\n');
                pythonProcess.stdin.end();
            } catch (stdinErr) {
                console.error("[Python ML] Error writing to stdin:", stdinErr);
            }
        }

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const errStr = data.toString();
            errorOutput += errStr;
            console.error(`[Python ML] stderr:`, errStr.trim());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Python ML] Script exited with code ${code}`);
                if (!errorOutput.trim()) {
                    errorOutput = output ? `[stdout instead of stderr]: ${output.trim()}` : 'No error message captured';
                }
                console.error(`[Python ML] Error output: ${errorOutput}`);
                return reject(new Error(`ML script failed with code ${code}: ${errorOutput}`));
            }
            try {
                const startMarker = '__JSON_START__';
                const endMarker = '__JSON_END__';
                let jsonStr = output.trim();
                const startIndex = output.indexOf(startMarker);
                const endIndex = output.indexOf(endMarker);

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonStr = output.substring(startIndex + startMarker.length, endIndex).trim();
                } else {
                    console.warn("[Python ML] Output markers not found. Attempting raw parse.");
                }

                const result = JSON.parse(jsonStr);
                console.log(`[Python ML] Successfully parsed result`);
                resolve(result);
            } catch (err) {
                console.error("[Python ML] Raw Output:", output);
                reject(new Error(`Failed to parse ML output: ${err.message}`));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error(`[Python ML] Process error:`, err.message);
            reject(err);
        });
    });
};

exports.runRandomForest = async (data, thresholds = null) => {
    const rfStart = Date.now();
    console.log('[ML DEBUG] runRandomForest started');
    const inputPayload = thresholds ? { data, thresholds } : { data };
    const result = await callMLService('rf', inputPayload);
    console.log(
        `[ML DEBUG] runRandomForest finished in ${Date.now() - rfStart} ms`
    );
    return result;
};

exports.runCNN = async (data) => {
    return await callMLService('cnn', { data });
};

// --- Retraining Pipelines ---

exports.runDataCollector = async () => {
    // data_collector.py does not require input JSON, but our helper expects an arg. Passing empty obj.
    console.log("Starting Data Collection...");
    return await runPythonML('scripts/data_collector.py', {});
};

exports.trainRandomForest = async () => {
    console.log("Starting Random Forest Training...");
    return await runPythonML('scripts/train_random_forest.py', {});
};

exports.trainCNN = async () => {
    console.log("Starting CNN Training...");
    return await runPythonML('scripts/train_cnn.py', {});
};

exports.retrainModels = async () => {
    // 1. Collect Data
    await exports.runDataCollector();

    // 2. Train Models (Sequential)
    const rfResult = await exports.trainRandomForest();
    const cnnResult = await exports.trainCNN();

    // 3. Get Version Registry
    const fs = require('fs');
    const path = require('path');
    let registry = {};
    try {
        const registryPath = path.join(__dirname, '../../ML Model/models/registry.json');
        if (fs.existsSync(registryPath)) {
            registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        }
    } catch (e) {
        console.error("Registry load error:", e);
    }

    return {
        success: true,
        message: "Advanced ML models retrained with Phase 1-3 improvements.",
        rf_metrics: rfResult,
        cnn_metrics: cnnResult,
        registry: registry
    };
};

/**
 * Refresh analysis for a specific region using cached data
 * @param {string} region - Name of the region
 * @returns {Promise<object>} - Refreshed analysis results
 */
exports.refreshAnalysis = async (region) => {
    try {
        const normalizeRegionKey = (region) => {
            if (!region) return '';
            return region.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        };

        // 1. Find existing preprocessed data
        const dataRecord = await Data.findOne({ region: region }).sort({ createdAt: -1 });
        if (!dataRecord) {
            throw new Error(`No data found for ${region}. Run full analysis first.`);
        }

        if (!dataRecord.isPreprocessed || !dataRecord.preprocessedData) {
            throw new Error(`Data for ${region} is not preprocessed. Run full analysis first.`);
        }

        // 2. Run inference only
        const config = await Config.findOne() || { deforestationRisk: { high: 0.7, medium: 0.4 } };

        const rfResults = await exports.runRandomForest(dataRecord.preprocessedData, {
            highThreshold: config.deforestationRisk.high / 100,
            mediumThreshold: config.deforestationRisk.medium / 100
        });

        if (!rfResults || typeof rfResults.risk_score === 'undefined') {
            throw new Error("ML Service returned invalid response.");
        }

        // 3. Build results
        const rawFeatures = dataRecord.preprocessedData.features || {};
        const rawSummary = dataRecord.preprocessedData.summary || {};
        const finalResults = {
            risk_score: rfResults.risk_score,
            risk_level: rfResults.risk_level || 'Medium',
            confidence: rfResults.confidence || 0.5,
            recommended_tree: rfResults.recommended_tree || 'General Reforestation',
            recommendation_confidence: rfResults.recommendation_confidence || 0.5,
            forest_loss_trend: rfResults.trends || [],
            reforestation_recommendations: rfResults.reforestation_recommendations || [],
            feature_importance: rfResults.feature_importance || {},
            features: {
                ndvi: rawFeatures.ndvi ?? rawFeatures.NDVI ?? 0.5,
                evi: rawFeatures.evi ?? rawFeatures.EVI ?? 0.3,
                lst: rawFeatures.lst ?? rawFeatures.LST ?? rawSummary.avgTemp ?? 25.0,
                soilMoisture: rawFeatures.soilMoisture ?? rawFeatures.Soil_Moisture ?? rawSummary.avgHumidity ?? 30.0,
                temperature: rawFeatures.temperature ?? rawFeatures.Air_Temp ?? rawSummary.avgTemp ?? 25.0,
                rainfall: rawFeatures.rainfall ?? rawFeatures.Rainfall ?? rawSummary.totalRain ?? 100.0,
                humidity: rawFeatures.humidity ?? rawFeatures.Humidity ?? rawSummary.avgHumidity ?? 50.0,
                elevation: rawFeatures.elevation ?? rawFeatures.Elevation ?? 500.0,
                soilType: rawFeatures.soilType ?? rawFeatures.Soil_Type ?? 1
            }
        };

        // 4. Update cached analysis
        const regionKey = normalizeRegionKey(region);
        const riskZoneService = require('./riskZoneService');
        const regionsUtil = require('../utils/regions');

            // Generate zones for the region
            let zones = [];
            try {
                const regionData = regionsUtil.getRegionById(region);
                if (regionData) {
                    zones = riskZoneService.generateZones(regionData.bbox, {
                        forest_loss_risk: rfResults.risk_score,
                        cnn_risk_score: rfResults.risk_score
                    }, rfResults.risk_level || 'Medium');
                }
            } catch (zoneErr) {
                console.warn(`Failed to generate zones for ${region}:`, zoneErr.message);
            }

            // Normalize risk level to match Mongoose enum if necessary (e.g., 'Medium' -> 'MEDIUM')
            const normalizedRiskLevel = rfResults.risk_level === 'Medium' ? 'MEDIUM' : (rfResults.risk_level || 'Moderate');

            console.log(`[ML Service] Updating Analysis for regionKey: ${regionKey}, Risk Level: ${normalizedRiskLevel}`);
            
            const updatedAnalysis = await Analysis.findOneAndUpdate(
                { regionKey },
                {
                    regionKey,
                    displayName: region,
                    riskScore: rfResults.risk_score,
                    riskLevel: normalizedRiskLevel,
                    confidence: rfResults.confidence,
                    recommendations: rfResults.reforestation_recommendations,
                    features: finalResults.features,
                    forest_loss_trend: finalResults.forest_loss_trend,
                    zones: zones,
                    updatedAt: new Date()
                },
                { upsert: true, new: true, runValidators: true }
            );

            if (updatedAnalysis) {
                console.log(`[ML Service] Successfully updated analysis for ${region}. New updatedAt: ${updatedAnalysis.updatedAt}`);
            } else {
                console.warn(`[ML Service] findOneAndUpdate returned null for ${region}`);
            }

        return {
            success: true,
            results: finalResults
        };
    } catch (error) {
        console.error(`Error in refreshAnalysis for ${region}:`, error.message);
        throw error;
    }
};
