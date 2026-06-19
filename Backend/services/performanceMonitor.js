/**
 * Performance Monitoring Service
 * Tracks API performance, cache metrics, and system health
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            api: {
                totalRequests: 0,
                responseTimes: [],
                errorCount: 0,
                endpointStats: {}
            },
            cache: {
                hits: 0,
                misses: 0,
                staleHits: 0,
                expiredHits: 0
            },
            ml: {
                inferenceCount: 0,
                averageInferenceTime: 0,
                modelLoadTime: 0,
                pythonProcessStarts: 0
            },
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };

        this.startTime = Date.now();
        this.maxResponseTimeSamples = 1000; // Keep last 1000 response times
    }

    // API Performance Tracking
    recordApiRequest(endpoint, method, responseTime, statusCode) {
        this.metrics.api.totalRequests++;

        // Track response times (keep only recent samples)
        this.metrics.api.responseTimes.push(responseTime);
        if (this.metrics.api.responseTimes.length > this.maxResponseTimeSamples) {
            this.metrics.api.responseTimes.shift();
        }

        // Track errors
        if (statusCode >= 400) {
            this.metrics.api.errorCount++;
        }

        // Track endpoint-specific stats
        const endpointKey = `${method} ${endpoint}`;
        if (!this.metrics.api.endpointStats[endpointKey]) {
            this.metrics.api.endpointStats[endpointKey] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                errors: 0
            };
        }

        const stats = this.metrics.api.endpointStats[endpointKey];
        stats.count++;
        stats.totalTime += responseTime;
        stats.avgTime = stats.totalTime / stats.count;

        if (statusCode >= 400) {
            stats.errors++;
        }
    }

    // Cache Performance Tracking
    recordCacheHit(cacheStatus) {
        if (cacheStatus?.fresh) {
            this.metrics.cache.hits++;
        } else if (cacheStatus?.stale) {
            this.metrics.cache.staleHits++;
        } else if (cacheStatus?.expired) {
            this.metrics.cache.expiredHits++;
        }
    }

    recordCacheMiss() {
        this.metrics.cache.misses++;
    }

    // ML Performance Tracking
    recordInference(startTime, endTime) {
        this.metrics.ml.inferenceCount++;
        const inferenceTime = endTime - startTime;

        // Update rolling average
        const currentAvg = this.metrics.ml.averageInferenceTime;
        const newCount = this.metrics.ml.inferenceCount;
        this.metrics.ml.averageInferenceTime = ((currentAvg * (newCount - 1)) + inferenceTime) / newCount;
    }

    recordModelLoadTime(loadTime) {
        this.metrics.ml.modelLoadTime = loadTime;
    }

    recordPythonProcessStart() {
        this.metrics.ml.pythonProcessStarts++;
    }

    // System Health Tracking
    updateSystemMetrics() {
        this.metrics.system.uptime = process.uptime();
        this.metrics.system.memoryUsage = process.memoryUsage();
        this.metrics.system.cpuUsage = process.cpuUsage();
    }

    // Get comprehensive metrics
    getMetrics() {
        this.updateSystemMetrics();

        const cacheTotal = this.metrics.cache.hits + this.metrics.cache.misses + this.metrics.cache.staleHits + this.metrics.cache.expiredHits;
        const cacheHitRate = cacheTotal > 0 ? ((this.metrics.cache.hits + this.metrics.cache.staleHits) / cacheTotal * 100).toFixed(2) : 0;

        return {
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            api: {
                ...this.metrics.api,
                averageResponseTime: this.metrics.api.responseTimes.length > 0
                    ? (this.metrics.api.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.api.responseTimes.length).toFixed(2)
                    : 0,
                errorRate: this.metrics.api.totalRequests > 0
                    ? ((this.metrics.api.errorCount / this.metrics.api.totalRequests) * 100).toFixed(2)
                    : 0
            },
            cache: {
                ...this.metrics.cache,
                totalRequests: cacheTotal,
                hitRate: cacheHitRate
            },
            ml: {
                ...this.metrics.ml,
                averageInferenceTime: Math.round(this.metrics.ml.averageInferenceTime)
            },
            system: {
                ...this.metrics.system,
                memoryUsageMB: {
                    rss: Math.round(this.metrics.system.memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(this.metrics.system.memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(this.metrics.system.memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(this.metrics.system.memoryUsage.external / 1024 / 1024)
                }
            }
        };
    }

    // Get health status
    getHealthStatus() {
        const metrics = this.getMetrics();

        // Define health thresholds
        const thresholds = {
            api: {
                maxErrorRate: 5, // 5%
                maxAvgResponseTime: 5000 // 5 seconds
            },
            cache: {
                minHitRate: 70 // 70%
            },
            system: {
                maxMemoryUsage: 512 // 512MB
            }
        };

        let overallHealth = 'healthy';
        const issues = [];

        // Check API health
        if (metrics.api.errorRate > thresholds.api.maxErrorRate) {
            overallHealth = 'degraded';
            issues.push(`High error rate: ${metrics.api.errorRate}%`);
        }
        if (metrics.api.averageResponseTime > thresholds.api.maxAvgResponseTime) {
            overallHealth = 'degraded';
            issues.push(`Slow responses: ${metrics.api.averageResponseTime}ms avg`);
        }

        // Check cache health
        if (metrics.cache.hitRate < thresholds.cache.minHitRate && metrics.cache.totalRequests > 10) {
            overallHealth = 'warning';
            issues.push(`Low cache hit rate: ${metrics.cache.hitRate}%`);
        }

        // Check system health
        if (metrics.system.memoryUsageMB.heapUsed > thresholds.system.maxMemoryUsage) {
            overallHealth = 'warning';
            issues.push(`High memory usage: ${metrics.system.memoryUsageMB.heapUsed}MB`);
        }

        return {
            status: overallHealth,
            timestamp: metrics.timestamp,
            uptime: metrics.uptime,
            issues: issues,
            metrics: metrics
        };
    }

    // Reset metrics (useful for testing)
    reset() {
        this.metrics = {
            api: {
                totalRequests: 0,
                responseTimes: [],
                errorCount: 0,
                endpointStats: {}
            },
            cache: {
                hits: 0,
                misses: 0,
                staleHits: 0,
                expiredHits: 0
            },
            ml: {
                inferenceCount: 0,
                averageInferenceTime: 0,
                modelLoadTime: 0,
                pythonProcessStarts: 0
            },
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };
        this.startTime = Date.now();
    }
}

module.exports = new PerformanceMonitor();