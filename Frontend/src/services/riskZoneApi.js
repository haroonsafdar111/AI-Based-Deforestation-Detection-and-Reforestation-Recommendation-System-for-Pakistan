import { fetchWithAuth } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const riskZoneApi = {
    /**
     * Fetch deforestation risk zones for a specific region.
     * @param {string} regionName - The region identifier
     * @returns {Promise<Array>} - Array of zone objects { lat, lng, risk_score }
     */
    fetchRiskZones: async (regionName) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/risk-zones/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ region: regionName })
            });

            if (!response.ok) {
                // Specialized handling for RBAC / Auth failures
                if (response.status === 401) {
                    throw new Error("UNAUTHORIZED_ACCESS");
                }

                // Handle 404 (No Data) or 422 (ML Missing) gracefully
                if (response.status === 404) {
                    throw new Error("No training data available for this region.");
                }
                // 422 block removed to allow debug parsing below
                const err = await response.json();
                console.error("RiskZone API Error Data:", err);
                const msg = err.debug_rf ? `RF Error: ${JSON.stringify(err.debug_rf)}` : (err.message || "Failed to fetch risk zones.");
                throw new Error(msg);
            }

            const data = await response.json();

            // Backend returns: { success: true, region: "...", geometry: {...}, zones: [...] }
            // Return full object so caller can access geometry
            return {
                zones: data.zones || [],
                geometry: data.geometry
            };
        } catch (error) {
            console.error("RiskZone API Error:", error);
            throw error;
        }
    },

    getConfig: async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/admin/config`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error("RiskZone API: Failed to fetch config", error);
            return null;
        }
    }
};
