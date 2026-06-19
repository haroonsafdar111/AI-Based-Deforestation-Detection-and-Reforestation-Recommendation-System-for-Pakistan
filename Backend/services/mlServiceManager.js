#!/usr/bin/env node

/**
 * ML Service Manager
 * Starts and manages the Python ML inference service
 */

const { spawn } = require('child_process');
const path = require('path');

class MLServiceManager {
    constructor() {
        this.pythonProcess = null;
        this.isRunning = false;
        this.restartAttempts = 0;
        this.maxRestartAttempts = 3;
    }

    async start() {
        if (process.env.ML_SERVICE_SPAWN === 'false') {
            console.log('[ML Service Manager] Local ML Service spawning disabled by environment. Skipping start.');
            this.isRunning = true;
            return;
        }

        // Correct path: ML Service is in the root directory
        const mlServicePath = path.join(__dirname, '..', '..', 'ML Service');
        const mainScript = path.join(mlServicePath, 'main.py');

        console.log(`[ML Service Manager] Starting Python ML service from ${mlServicePath}...`);

        const venvPythonPath = path.join(mlServicePath, '.venv', 'Scripts', 'python.exe');
        const fs = require('fs');

        let pythonCommands = [];
        
        if (process.platform === 'win32') {
            if (fs.existsSync(venvPythonPath)) {
                pythonCommands.push([venvPythonPath, []]);
            }
            pythonCommands.push(['py', ['-3']], ['python', []], ['python3', []], ['python.exe', []]);
        } else {
            pythonCommands = [['python3', []], ['python', []]];
        }

        for (const [command, args] of pythonCommands) {
            try {
                await this.attemptStartup(command, args, mainScript, mlServicePath);
                this.isRunning = true;
                this.restartAttempts = 0; // Reset on success
                return;
            } catch (err) {
                console.warn(`[ML Service Manager] Failed to start with ${command}: ${err.message}`);
                continue; // Try next command
            }
        }

        throw new Error('All Python startup commands failed');
    }

    async attemptStartup(command, args, script, cwd) {
        return new Promise((resolve, reject) => {
            const runtimeArgs = [...args, script];
            
            // Check health first to see if already running
            this.checkHealth()
                .then(() => {
                    this.isRunning = true;
                    resolve();
                })
                .catch(() => {
                    this.pythonProcess = spawn(command, runtimeArgs, {
                        cwd: cwd,
                        stdio: ['pipe', 'pipe', 'pipe'],
                        detached: false
                    });

                    const startupTimeout = setTimeout(() => {
                        if (!this.isRunning) {
                            if (this.pythonProcess) this.pythonProcess.kill();
                            reject(new Error('Startup timed out'));
                        }
                    }, 30000);

                    this.pythonProcess.stdout.on('data', (data) => {
                        const output = data.toString();
                        console.log('[ML Service] ' + output.trim());

                        if (output.includes('Application startup complete') || output.includes('Uvicorn running on')) {
                            this.isRunning = true;
                            clearTimeout(startupTimeout);
                            resolve();
                        }
                    });

                    this.pythonProcess.stderr.on('data', (data) => {
                        const errOutput = data.toString().trim();
                        if (errOutput) console.error('[ML Service Error] ' + errOutput);
                    });

                    this.pythonProcess.on('error', (err) => {
                        clearTimeout(startupTimeout);
                        reject(err);
                    });

                    this.pythonProcess.on('close', (code) => {
                        clearTimeout(startupTimeout);
                        this.isRunning = false;
                        console.log(`[ML Service Manager] Python process exited with code ${code}`);
                        
                        // Only auto-restart if we reached a "running" state before
                        if (code !== 0 && this.isRunning && this.restartAttempts < this.maxRestartAttempts) {
                            this.restartAttempts++;
                            console.log(`[ML Service Manager] Attempting restart (${this.restartAttempts}/${this.maxRestartAttempts})...`);
                            setTimeout(() => this.start().catch(e => console.error('Background restart failed:', e.message)), 2000);
                        }
                        
                        if (!this.isRunning) {
                            reject(new Error(`Exited with code ${code}`));
                        }
                    });
                });
        });
    }

    async checkHealth() {
        const axios = require('axios');
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

        try {
            const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data;
        } catch (error) {
            throw new Error('ML service not healthy');
        }
    }

    async stop() {
        if (this.pythonProcess) {
            console.log('[ML Service Manager] Stopping ML service...');
            this.pythonProcess.kill('SIGTERM');

            await new Promise(resolve => {
                this.pythonProcess.on('close', resolve);
                setTimeout(resolve, 5000);
            });

            this.pythonProcess = null;
            this.isRunning = false;
            console.log('[ML Service Manager] ML service stopped');
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            processPid: this.pythonProcess ? this.pythonProcess.pid : null
        };
    }
}

module.exports = new MLServiceManager();

if (require.main === module) {
    const manager = module.exports;

    process.on('SIGINT', async () => {
        console.log('\n[ML Service Manager] Received SIGINT, shutting down...');
        await manager.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n[ML Service Manager] Received SIGTERM, shutting down...');
        await manager.stop();
        process.exit(0);
    });

    manager.start()
        .then(() => {
            console.log('[ML Service Manager] ML service is running. Press Ctrl+C to stop.');
        })
        .catch((error) => {
            console.error('[ML Service Manager] Failed to start ML service:', error);
            process.exit(1);
        });
}

module.exports = new MLServiceManager();

// If run directly, start the service
if (require.main === module) {
    const manager = module.exports;

    process.on('SIGINT', async () => {
        console.log('\n[ML Service Manager] Received SIGINT, shutting down...');
        await manager.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n[ML Service Manager] Received SIGTERM, shutting down...');
        await manager.stop();
        process.exit(0);
    });

    manager.start()
        .then(() => {
            console.log('[ML Service Manager] ML service is running. Press Ctrl+C to stop.');
        })
        .catch((error) => {
            console.error('[ML Service Manager] Failed to start ML service:', error);
            process.exit(1);
        });
}