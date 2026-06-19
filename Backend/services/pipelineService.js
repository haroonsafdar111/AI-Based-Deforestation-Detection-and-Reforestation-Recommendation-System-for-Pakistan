const { spawn } = require('child_process');
const path = require('path');

/**
 * Interface to Python data pipelines
 */
exports.runDataPipeline = (region, startDate, endDate) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../pipelines/orchestrator.py');
        console.log(`Executing Python pipeline: ${scriptPath} ${region} ${startDate} ${endDate}`);

        // Use 'py' for Windows Python Launcher compatibility
        const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
        const pythonProcess = spawn(pythonCommand, [scriptPath, region, startDate, endDate]);

        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python pipeline failed with code ${code}: ${error}`);
                return reject(new Error(error || `Python pipeline exited with code ${code}`));
            }

            try {
                // Robust Parsing: Look for marked JSON block first
                const startMarker = '__JSON_START__';
                const endMarker = '__JSON_END__';

                let jsonStr = '';
                const startIndex = result.indexOf(startMarker);
                const endIndex = result.indexOf(endMarker);

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonStr = result.substring(startIndex + startMarker.length, endIndex).trim();
                } else {
                    // Fallback: Find the first '{' for backward compatibility
                    const jsonStart = result.indexOf('{');
                    if (jsonStart === -1) {
                        return reject(new Error('No valid JSON output (or markers) from Python script'));
                    }
                    // Attempt to parse properly even if there's trailing garbage implies we should find the last '}'? 
                    // But simpler to just trust JSON.parse or try to substring to last }
                    jsonStr = result.substring(jsonStart);
                    // Locate last close brace to avoid trailing garbage error
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (lastBrace !== -1) {
                        jsonStr = jsonStr.substring(0, lastBrace + 1);
                    }
                }

                const jsonResult = JSON.parse(jsonStr);
                resolve(jsonResult);
            } catch (err) {
                console.error("Pipeline Raw Output:", result);
                reject(new Error(`Failed to parse pipeline output: ${err.message}`));
            }
        });
    });
};
