const riskZoneService = {
    /**
     * Generate spatial risk zones based on ML outputs and region bounds.
     * 
     * @param {Array<number>} bbox - [minLat, minLng, maxLat, maxLng]
     * @param {object} mlOutputs - { forest_loss_risk: number, cnn_risk_score: number }
     * @returns {Array<object>} - Array of { lat, lng, risk_score }
     */
    generateZones: (bbox, mlOutputs, riskLevel = 'Medium') => {
        if (!bbox || bbox.length !== 4) {
            throw new Error("Invalid bounding box provided.");
        }

        const [minLatRaw, minLngRaw, maxLatRaw, maxLngRaw] = bbox;
        
        // Anti-Gravity: Inset bbox by 0.5% to ensure points are strictly inside for frontend filtering
        const latInset = (maxLatRaw - minLatRaw) * 0.005;
        const lngInset = (maxLngRaw - minLngRaw) * 0.005;
        const minLat = minLatRaw + latInset;
        const maxLat = maxLatRaw - latInset;
        const minLng = minLngRaw + lngInset;
        const maxLng = maxLngRaw - lngInset;

        const { forest_loss_risk, cnn_risk_score } = mlOutputs;

        // Validation
        if (typeof forest_loss_risk !== 'number' || typeof cnn_risk_score !== 'number') {
            throw new Error("Invalid ML outputs provided.");
        }

        const zones = [];

        // Dynamic Threshold based on predicted Risk Level (Tuned for Hotspot Isolation)
        const THRESHOLDS = {
            'High': 0.25,
            'Medium': 0.45,
            'Low': 0.65
        };
        const THRESHOLD = THRESHOLDS[riskLevel] || THRESHOLDS['Medium'];

        // Grid Configuration (Adaptive)
        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;
        const targetPoints = 400; // Increased for better regional density

        // Calculate rough step size
        let step = Math.sqrt((latDiff * lngDiff) / targetPoints);
        // Clamp step size: Min 0.0005 for high detail, Max 0.5 for country view
        step = Math.max(0.0005, Math.min(step, 0.5));
        const STEP = step;

        // Generate Grid Points
        for (let lat = minLat; lat <= maxLat; lat += STEP) {
            for (let lng = minLng; lng <= maxLng; lng += STEP) {
                // EXPLICIT DEFINITION at start of loop to prevent ReferenceError
                let base_risk = (0.6 * forest_loss_risk) + (0.4 * cnn_risk_score);
                // Moderate frequency noise (150x) creates distinct organic islands
                const noise = (Math.sin(lat * 150) * 0.35) + (Math.cos(lng * 150) * 0.35);

                let final_risk = base_risk + noise;
                final_risk = Math.min(Math.max(final_risk, 0), 1);

                // SKIP points below the threshold to prevent covering safe areas
                if (final_risk < THRESHOLD) continue;

                // Create Zone Point
                zones.push({
                    lat: Number(lat.toFixed(4)),
                    lng: Number(lng.toFixed(4)),
                    risk_score: Number(final_risk.toFixed(4))
                });
            }
        }

        return zones;
    }
};

module.exports = riskZoneService;
