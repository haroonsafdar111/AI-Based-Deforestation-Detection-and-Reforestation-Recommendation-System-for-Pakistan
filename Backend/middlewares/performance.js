/**
 * Performance Monitoring Middleware
 * Tracks API response times and integrates with performance monitor
 */

const performanceMonitor = require('../services/performanceMonitor');

const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Record API metrics
        performanceMonitor.recordApiRequest(
            req.route?.path || req.path,
            req.method,
            responseTime,
            res.statusCode
        );

        // Call original end method
        originalEnd.apply(this, args);
    };

    next();
};

module.exports = performanceMiddleware;