/**
 * Job Queue Service
 * Handles background tasks using Bull and Redis
 */

const Queue = require('bull');
const Redis = require('ioredis');

// Job queues
let analysisRefreshQueue = null;
let dataPipelineQueue = null;
let modelRetrainingQueue = null;

// Initialize Redis connection
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null, // Essential for Bull
    lazyConnect: false // Connect immediately
};

class JobQueueService {
    constructor() {
        this.isInitialized = false;
        this.redisClient = null;
    }

    async initialize() {
        try {
            console.log('[Job Queue] Initializing connection to Redis with options:', { ...redisOptions, password: redisOptions.password ? '***' : undefined });
            
            // Re-configure redis client with better error handling
            this.redisClient = new Redis({
                ...redisOptions,
                lazyConnect: false,      // Override lazyConnect to force immediate connection
                maxRetriesPerRequest: 1, // Fail fast during init
                connectTimeout: 5000     // 5 second timeout
            });

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('[Job Queue] Redis connection timed out. Falling back to synchronous mode.');
                    this.isInitialized = false;
                    resolve();
                }, 2000);  // Reduced from 6000ms to 2000ms for faster fallback

                this.redisClient.on('connect', () => {
                    clearTimeout(timeout);
                    console.log('[Job Queue] Redis connected successfully');
                    
                    try {
                        // Initialize queues (Re-using redisOptions but with bull defaults)
                        analysisRefreshQueue = new Queue('analysis-refresh', {
                            redis: redisOptions
                        });

                        dataPipelineQueue = new Queue('data-pipeline', {
                            redis: redisOptions
                        });

                        modelRetrainingQueue = new Queue('model-retraining', {
                            redis: redisOptions
                        });

                        this.setupJobProcessors();
                        this.isInitialized = true;
                        console.log('[Job Queue] Service initialized with Redis');
                    } catch (queueErr) {
                        console.error('[Job Queue] Failed to setup Bull queues:', queueErr.message);
                        this.isInitialized = false;
                    }
                    resolve();
                });

                this.redisClient.on('error', (err) => {
                    clearTimeout(timeout);
                    console.warn('[Job Queue] Redis connection unavailable:', err.message);
                    this.isInitialized = false;
                    resolve();
                });
            });

        } catch (error) {
            console.warn('[Job Queue] Initialization crash:', error.message);
            this.isInitialized = false;
        }
    }

    setupJobProcessors() {
        // Skip processor setup if Redis not available
        if (!analysisRefreshQueue || !dataPipelineQueue || !modelRetrainingQueue) {
            console.warn('[Job Queue] Queues not initialized, skipping processor setup');
            return;
        }

        // Analysis refresh processor
        analysisRefreshQueue.process('refresh-region', async (job) => {
            const { region } = job.data;
            console.log(`[Job Queue] Worker picked up analysis refresh for region: ${region}`);

            try {
                const mlService = require('./mlService');
                const result = await mlService.refreshAnalysis(region);

                if (result.success) {
                    console.log(`[Job Queue] Analysis refresh completed for ${region}`);
                    return { success: true, region, result: result.results };
                } else {
                    throw new Error('Analysis refresh failed');
                }
            } catch (error) {
                console.error(`[Job Queue] Analysis refresh failed for ${region}:`, error.message);
                throw error;
            }
        });

        // Data pipeline processor
        dataPipelineQueue.process('run-pipeline', async (job) => {
            const { region, timeRange } = job.data;
            console.log(`[Job Queue] Processing data pipeline for region: ${region}`);

            try {
                const pipelineService = require('./pipelineService');
                const result = await pipelineService.runUnifiedPipeline(region, timeRange);

                console.log(`[Job Queue] Data pipeline completed for ${region}`);
                return { success: true, region, result };
            } catch (error) {
                console.error(`[Job Queue] Data pipeline failed for ${region}:`, error.message);
                throw error;
            }
        });

        // Model retraining processor
        modelRetrainingQueue.process('retrain-models', async (job) => {
            console.log('[Job Queue] Worker picked up model retraining job');

            try {
                const mlService = require('./mlService');
                const result = await mlService.retrainModels();

                console.log('[Job Queue] Model retraining completed');
                return { success: true, result };
            } catch (error) {
                console.error('[Job Queue] Model retraining failed:', error.message);
                throw error;
            }
        });

        // Set up event listeners for monitoring
        [analysisRefreshQueue, dataPipelineQueue, modelRetrainingQueue].forEach(queue => {
            queue.on('completed', (job, result) => {
                console.log(`[Job Queue] Job ${job.id} completed: ${job.name}`);
            });

            queue.on('failed', (job, err) => {
                console.error(`[Job Queue] Job ${job.id} failed: ${job.name} - ${err.message}`);
            });

            queue.on('stalled', (job) => {
                console.warn(`[Job Queue] Job ${job.id} stalled: ${job.name}`);
            });
        });
    }

    // Public methods for adding jobs
    async addAnalysisRefreshJob(region, options = {}) {
        if (this.isInitialized && analysisRefreshQueue) {
            try {
                const normalizedRegion = region.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                const jobId = `refresh-${normalizedRegion}`;

                const existingJob = await analysisRefreshQueue.getJob(jobId);
                if (existingJob) {
                    const state = await existingJob.getState();
                    if (['waiting', 'active', 'delayed', 'paused'].includes(state)) {
                        console.log(`[Job Queue] Refresh job already exists for ${region}. Reusing existing job.`);
                        return existingJob;
                    }
                    if (['completed', 'failed'].includes(state)) {
                        try {
                            await existingJob.remove();
                            console.log(`[Job Queue] Removed completed/failed job ${jobId} to allow a fresh refresh.`);
                        } catch (removeErr) {
                            console.log(`[Job Queue] Job ${jobId} already removed by another concurrent routine.`);
                        }
                    }
                }

                const job = await analysisRefreshQueue.add('refresh-region', { region }, {
                    jobId,
                    removeOnComplete: true,
                    removeOnFail: true,
                    priority: options.priority || 0,
                    delay: options.delay || 0,
                    ...options
                });

                console.log(`[Job Queue] Added analysis refresh job for ${region} (ID: ${job.id})`);
                return job;
            } catch (queueErr) {
                console.warn('[Job Queue] Failed to add job to Redis, falling back to sync:', queueErr.message);
                // Fall through to synchronous execution
            }
        }

        // Fallback to synchronous execution
        console.log(`[Job Queue] Executing analysis refresh synchronously for ${region}`);
        try {
            const mlService = require('./mlService');
            return await mlService.refreshAnalysis(region);
        } catch (error) {
            console.error(`[Job Queue] Synchronous analysis refresh failed for ${region}:`, error.message);
            throw error;
        }
    }

    async addDataPipelineJob(region, timeRange, options = {}) {
        if (this.isInitialized && dataPipelineQueue) {
            try {
                const job = await dataPipelineQueue.add('run-pipeline', { region, timeRange }, {
                    priority: options.priority || 0,
                    delay: options.delay || 0,
                    ...options
                });

                console.log(`[Job Queue] Added data pipeline job for ${region} (ID: ${job.id})`);
                return job;
            } catch (queueErr) {
                console.warn('[Job Queue] Failed to add pipeline job to Redis, falling back to sync:', queueErr.message);
            }
        }

        console.log(`[Job Queue] Executing data pipeline synchronously for ${region}`);
        try {
            const pipelineService = require('./pipelineService');
            return await pipelineService.runUnifiedPipeline(region, timeRange);
        } catch (error) {
            console.error(`[Job Queue] Synchronous data pipeline failed for ${region}:`, error.message);
            throw error;
        }
    }

    async addModelRetrainingJob(options = {}) {
        if (this.isInitialized && modelRetrainingQueue) {
            try {
                const job = await modelRetrainingQueue.add('retrain-models', {}, {
                    priority: options.priority || 10,
                    delay: options.delay || 0,
                    ...options
                });

                console.log(`[Job Queue] Added model retraining job (ID: ${job.id})`);
                return job;
            } catch (queueErr) {
                console.warn('[Job Queue] Failed to add retraining job to Redis, falling back to sync:', queueErr.message);
            }
        }

        console.log('[Job Queue] Executing model retraining synchronously');
        try {
            const mlService = require('./mlService');
            return await mlService.retrainModels();
        } catch (error) {
            console.error('[Job Queue] Synchronous model retraining failed:', error.message);
            throw error;
        }
    }

    // Queue status and monitoring
    async getQueueStatus() {
        if (!this.isInitialized) {
            return {
                initialized: false,
                message: 'Job queues not available (Redis not connected)'
            };
        }

        try {
            const [analysisStats, pipelineStats, retrainingStats] = await Promise.all([
                analysisRefreshQueue.getJobCounts(),
                dataPipelineQueue.getJobCounts(),
                modelRetrainingQueue.getJobCounts()
            ]);

            return {
                initialized: true,
                redis_connected: this.redisClient.status === 'ready',
                queues: {
                    analysis_refresh: analysisStats,
                    data_pipeline: pipelineStats,
                    model_retraining: retrainingStats
                }
            };
        } catch (error) {
            return {
                initialized: true,
                redis_connected: false,
                error: error.message
            };
        }
    }

    async getJobStatus(jobId, queueType = 'analysis-refresh') {
        if (!this.isInitialized) {
            return { error: 'Job queues not available' };
        }

        let queue;
        switch (queueType) {
            case 'analysis-refresh':
                queue = analysisRefreshQueue;
                break;
            case 'data-pipeline':
                queue = dataPipelineQueue;
                break;
            case 'model-retraining':
                queue = modelRetrainingQueue;
                break;
            default:
                return { error: 'Invalid queue type' };
        }

        try {
            const job = await queue.getJob(jobId);
            if (!job) {
                return { error: 'Job not found' };
            }

            return {
                id: job.id,
                name: job.name,
                data: job.data,
                progress: job.progress(),
                attemptsMade: job.attemptsMade,
                finishedOn: job.finishedOn,
                processedOn: job.processedOn,
                failedReason: job.failedReason,
                returnvalue: job.returnvalue,
                state: await job.getState()
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async cleanup() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }

        if (analysisRefreshQueue) {
            await analysisRefreshQueue.close();
        }
        if (dataPipelineQueue) {
            await dataPipelineQueue.close();
        }
        if (modelRetrainingQueue) {
            await modelRetrainingQueue.close();
        }

        console.log('[Job Queue] Cleanup completed');
    }
}

module.exports = new JobQueueService();