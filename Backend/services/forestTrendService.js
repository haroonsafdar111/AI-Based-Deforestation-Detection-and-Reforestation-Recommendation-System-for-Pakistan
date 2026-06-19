const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Forest Trend Analysis Service
 * Wraps the Python script forest_trend_analysis.py
 */
exports.analyzeForestTrend = (regionId) => {
    return new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'py' : (process.env.PYTHON_PATH || 'python');
        const scriptPath = path.join(__dirname, '../pipelines/forest_trend_analysis.py');

        logger.info(`Executing Forest Trend Analysis for ${regionId}...`);

        const pythonProcess = spawn(pythonPath, [scriptPath, regionId]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                logger.error(`Forest Trend Analysis failed with code ${code}: ${errorOutput}`);
                return reject(new Error(`Trend Analysis failed: ${errorOutput}`));
            }

            try {
                // Look for JSON block markers
                const startMarker = '__JSON_START__';
                const endMarker = '__JSON_END__';

                let jsonStr = output.trim();
                const startIndex = output.indexOf(startMarker);
                const endIndex = output.indexOf(endMarker);

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonStr = output.substring(startIndex + startMarker.length, endIndex).trim();
                }

                const result = JSON.parse(jsonStr);
                resolve(result);
            } catch (err) {
                logger.error(`Failed to parse Trend Analysis output: ${err.message}`);
                reject(new Error(`Failed to parse trend output: ${err.message}`));
            }
        });
    });
};
