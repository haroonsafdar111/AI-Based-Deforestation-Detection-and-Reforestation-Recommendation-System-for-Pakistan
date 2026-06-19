const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');

// Performance monitor service
const performanceMonitor = require('../services/performanceMonitor');
const jobQueueService = require('../services/jobQueueService');

// All monitoring routes require authentication
router.use(verifyToken);

// Get comprehensive performance metrics
router.get('/metrics', authorizeRoles('admin'), (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get metrics',
            error: error.message
        });
    }
});

// Get health status with detailed metrics
router.get('/health', authorizeRoles('admin', 'user'), (req, res) => {
    try {
        const healthStatus = performanceMonitor.getHealthStatus();
        res.json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        console.error('Error getting health status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get health status',
            error: error.message
        });
    }
});

// Get cache performance statistics
router.get('/cache', authorizeRoles('admin', 'user'), (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json({
            success: true,
            data: {
                cache: metrics.cache,
                recommendations: {
                    hitRate: metrics.cache.hitRate,
                    status: metrics.cache.hitRate > 80 ? 'excellent' :
                           metrics.cache.hitRate > 60 ? 'good' : 'needs_improvement'
                }
            }
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cache statistics',
            error: error.message
        });
    }
});

// Get ML performance statistics
router.get('/ml', authorizeRoles('admin', 'user'), (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json({
            success: true,
            data: {
                ml: metrics.ml,
                recommendations: {
                    inferenceTime: metrics.ml.averageInferenceTime,
                    status: metrics.ml.averageInferenceTime < 2000 ? 'excellent' :
                           metrics.ml.averageInferenceTime < 5000 ? 'good' : 'needs_improvement'
                }
            }
        });
    } catch (error) {
        console.error('Error getting ML stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ML statistics',
            error: error.message
        });
    }
});

// Get API performance statistics
router.get('/api', authorizeRoles('admin', 'user'), (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json({
            success: true,
            data: {
                api: metrics.api,
                recommendations: {
                    responseTime: metrics.api.averageResponseTime,
                    errorRate: metrics.api.errorRate,
                    status: (metrics.api.averageResponseTime < 1000 && metrics.api.errorRate < 2) ? 'excellent' :
                           (metrics.api.averageResponseTime < 3000 && metrics.api.errorRate < 5) ? 'good' : 'needs_improvement'
                }
            }
        });
    } catch (error) {
        console.error('Error getting API stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get API statistics',
            error: error.message
        });
    }
});

// Reset performance metrics (admin only)
router.post('/reset', authorizeRoles('admin'), (req, res) => {
    try {
        performanceMonitor.reset();
        res.json({
            success: true,
            message: 'Performance metrics reset successfully'
        });
    } catch (error) {
        console.error('Error resetting metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset metrics',
            error: error.message
        });
    }
});

// Combined dashboard metrics
router.get('/dashboard', authorizeRoles('admin', 'user'), async (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        const queueStatus = await jobQueueService.getQueueStatus();

        // Calculate overall system score (0-100)
        const apiScore = Math.max(0, 100 - (metrics.api.errorRate * 5) - (metrics.api.averageResponseTime / 50));
        const cacheScore = metrics.cache.hitRate;
        const mlScore = Math.max(0, 100 - (metrics.ml.averageInferenceTime / 50));

        const overallScore = Math.round((apiScore + cacheScore + mlScore) / 3);

        res.json({
            success: true,
            data: {
                overall_score: overallScore,
                status: overallScore > 80 ? 'excellent' :
                       overallScore > 60 ? 'good' : 'needs_attention',
                metrics: {
                    api: {
                        score: Math.round(apiScore),
                        response_time: metrics.api.averageResponseTime,
                        error_rate: metrics.api.errorRate,
                        total_requests: metrics.api.totalRequests
                    },
                    cache: {
                        score: Math.round(cacheScore),
                        hit_rate: metrics.cache.hitRate,
                        total_requests: metrics.cache.totalRequests,
                        hits: metrics.cache.hits
                    },
                    ml: {
                        score: Math.round(mlScore),
                        avg_inference_time: metrics.ml.averageInferenceTime,
                        total_inferences: metrics.ml.inferenceCount,
                        python_process_starts: metrics.ml.pythonProcessStarts
                    }
                },
                queues: queueStatus,
                system: {
                    uptime: metrics.uptime,
                    memory_mb: metrics.system.memoryUsageMB.heapUsed
                }
            }
        });
    } catch (error) {
        console.error('Error getting dashboard metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard metrics',
            error: error.message
        });
    }
});

module.exports = router;