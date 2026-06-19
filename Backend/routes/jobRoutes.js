const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');
const { logAuditAction } = require('../middlewares/audit');

// Job queue service
const jobQueueService = require('../services/jobQueueService');

// All job routes require authentication
router.use(verifyToken);

// Queue analysis refresh job
router.post('/analysis-refresh', authorizeRoles('admin', 'user'), async (req, res) => {
    try {
        const { region, priority = 0, delay = 0 } = req.body;

        if (!region) {
            return res.status(400).json({ success: false, message: 'Region is required' });
        }

        const job = await jobQueueService.addAnalysisRefreshJob(region, {
            priority,
            delay
        });

        res.json({
            success: true,
            message: 'Analysis refresh job queued successfully',
            job: {
                id: job.id,
                name: job.name,
                data: job.data,
                queue: 'analysis-refresh'
            }
        });
    } catch (error) {
        console.error('Error queuing analysis refresh job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to queue analysis refresh job',
            error: error.message
        });
    }
});

// Queue data pipeline job
router.post('/data-pipeline', authorizeRoles('admin'), async (req, res) => {
    try {
        const { region, timeRange, priority = 0, delay = 0 } = req.body;

        if (!region) {
            return res.status(400).json({ success: false, message: 'Region is required' });
        }

        const job = await jobQueueService.addDataPipelineJob(region, timeRange, {
            priority,
            delay
        });

        res.json({
            success: true,
            message: 'Data pipeline job queued successfully',
            job: {
                id: job.id,
                name: job.name,
                data: job.data,
                queue: 'data-pipeline'
            }
        });
    } catch (error) {
        console.error('Error queuing data pipeline job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to queue data pipeline job',
            error: error.message
        });
    }
});

// Queue model retraining job
router.post('/model-retraining', authorizeRoles('admin'), async (req, res) => {
    try {
        const { priority = 10, delay = 0 } = req.body;

        const job = await jobQueueService.addModelRetrainingJob({
            priority,
            delay
        });

        res.json({
            success: true,
            message: 'Model retraining job queued successfully',
            job: {
                id: job.id,
                name: job.name,
                queue: 'model-retraining'
            }
        });
    } catch (error) {
        console.error('Error queuing model retraining job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to queue model retraining job',
            error: error.message
        });
    }
});

// Get queue status
router.get('/status', authorizeRoles('admin', 'user'), async (req, res) => {
    try {
        const status = await jobQueueService.getQueueStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get queue status',
            error: error.message
        });
    }
});

// Get specific job status
router.get('/:queueType/:jobId', authorizeRoles('admin', 'user'), async (req, res) => {
    try {
        const { queueType, jobId } = req.params;

        if (!['analysis-refresh', 'data-pipeline', 'model-retraining'].includes(queueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type. Must be: analysis-refresh, data-pipeline, or model-retraining'
            });
        }

        const jobStatus = await jobQueueService.getJobStatus(jobId, queueType);
        res.json({
            success: true,
            data: jobStatus
        });
    } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get job status',
            error: error.message
        });
    }
});

module.exports = router;