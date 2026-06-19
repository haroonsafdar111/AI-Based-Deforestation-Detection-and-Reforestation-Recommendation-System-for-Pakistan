import { fetchWithAuth } from './authService';

const BASE_URLS = {
    BACKEND: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
};

const pendingRefreshes = new Set();

const normalizeCachedAnalysis = (analysis) => {
    if (!analysis) return analysis;

    return {
        ...analysis,
        risk_score: analysis.risk_score ?? analysis.riskScore,
        risk_level: analysis.risk_level ?? analysis.riskLevel,
        reforestation_recommendations: analysis.reforestation_recommendations ?? analysis.recommendations ?? [],
        recommended_tree: analysis.recommended_tree || analysis.recommendedTree || 'General Reforestation',
        confidence: analysis.confidence ?? 0.5,
        features: analysis.features || {},
        forest_loss_trend: analysis.forest_loss_trend ?? analysis.trends ?? [],
        zones: analysis.zones || analysis.zone || analysis.zones || []
    };
};

/**
 * ML INFERENCE SERVICE
 * Handles interactions with the backend ML endpoints.
 */
export const mlService = {
    /**
     * Trigger backend analysis for risk and forest loss trend
     * @param {string} region - The region to analyze
     * @param {object} timeRange - The time range for analysis
     * @returns {Promise<object>} - The inference results
     */
    getPrediction: async (region, timeRange = { start: '2023-01-01', end: '2024-01-01' }) => {
        const requestStart = performance.now();
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/ml/process-and-predict`, {
                method: 'POST',
                body: JSON.stringify({
                    region: region,
                    timeRange: timeRange
                })
            });

            const fetchElapsed = performance.now() - requestStart;
            console.log(`ML_SERVICE getPrediction fetch elapsed=${fetchElapsed.toFixed(1)}ms region=${region}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `ML Inference Failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`ML_SERVICE getPrediction response parse elapsed=${(performance.now() - requestStart).toFixed(1)}ms region=${region}`);
            return data;
        } catch (error) {
            console.error("Error in ML inference:", error);
            throw error;
        }
    },

    /**
     * Fetch the latest cached analysis for a region
     * @param {string} region - The region name
     * @returns {Promise<object>} - The cached analysis result with cache status
     */
    fetchLatestAnalysis: async (region) => {
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/ml/latest-analysis/${encodeURIComponent(region)}`);

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch analysis: ${response.statusText}`);
            }

            const result = await response.json();
            const data = normalizeCachedAnalysis(result.data);

            // Add cache status to the response
            data.cache_status = result.cache_status;

            return data;
        } catch (error) {
            console.error("Error fetching cached analysis:", error);
            throw error;
        }
    },

    /**
     * Queue a background analysis refresh job
     * @param {string} region - The region to refresh
     * @param {object} options - Job options (priority, delay, etc.)
     * @returns {Promise<object>} - Job status
     */
    queueAnalysisRefresh: async (region, options = {}) => {
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/jobs/analysis-refresh`, {
                method: 'POST',
                body: JSON.stringify({
                    region,
                    ...options
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to queue refresh job: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error queuing analysis refresh job:", error);
            throw error;
        }
    },

    /**
     * Checks if the cached analysis is stale or expired and queues a refresh job if needed.
     * Includes a lightweight 10-second in-memory debounce.
     * @param {string} region - The region to refresh
     * @param {object} analysis - The cached analysis result
     * @returns {Promise<object|null>} - Job status or null
     */
    queueRefreshIfStale: async (region, analysis) => {
        // Deprecated: Cache freshness checks and auto-refresh queueing are now handled entirely by the backend.
        return null;
    },

    /**
     * Refresh cached analysis for a region by calling backend refresh endpoint
     * @param {string} region - The region to refresh
     * @returns {Promise<object>} - The refreshed analysis result
     */
    refreshAnalysis: async (region) => {
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/ml/refresh-analysis/${encodeURIComponent(region)}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to refresh analysis: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Normalize the results if they exist
            if (result.results) {
                result.results = normalizeCachedAnalysis(result.results);
            }

            return result;
        } catch (error) {
            console.error("Error refreshing analysis:", error);
            throw error;
        }
    },

    /**
     * Fetch all high-risk zones from the backend
     * @returns {Promise<Array>} - List of high-risk analysis records
     */
    fetchRiskAlerts: async () => {
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/ml/all-risk-alerts`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch risk alerts: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching risk alerts:", error);
            throw error;
        }
    }
};
