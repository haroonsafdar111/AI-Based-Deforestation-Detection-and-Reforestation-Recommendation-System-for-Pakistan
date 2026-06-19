import { useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { mlService } from '../services/mlService';
import { authService } from '../services/authService';
import { pakistanRegions } from '../data/pakistanRegions';

const RISK_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

const RiskMonitor = () => {
    const { addNotification, notifications } = useNotification();
    const notifiedRegionsRef = useRef(new Set());

    const checkRisk = useCallback(async () => {
        const user = authService.getCurrentUser();
        if (!user) return;

        try {
            // Fetch all granular risk alerts from the backend
            const alerts = await mlService.fetchRiskAlerts();

            if (!alerts || alerts.length === 0) return;

            // Pre-calculate structural headers from pakistanRegions
            const provinceNames = pakistanRegions.map(p => p.name);
            const zoneNames = pakistanRegions.flatMap(p => p.zones.map(z => z.name));
            const structuralHeaders = [
                'Pakistan',
                'All Regions',
                ...provinceNames,
                ...zoneNames
            ];

            alerts.forEach(analysis => {
                const { displayName, riskScore, updatedAt } = analysis;

                // Skip structural headers (provinces, zones, etc) that are not specific selectable locations
                if (structuralHeaders.includes(displayName)) return;

                // Map riskScore (0-1) to percentage for messaging
                const riskPercent = Math.round(riskScore * 100);
                const regionId = displayName.toLowerCase().trim();
                const alertKey = `${regionId}-${riskPercent}-${new Date(updatedAt).getTime()}`;

                // Deduplicate per region and specific alert state
                if (notifiedRegionsRef.current.has(alertKey)) return;

                // Also check current notification state to avoid visual spam on re-renders
                const message = `The deforestation risk in ${displayName} is currently at ${riskPercent}%, which exceeds safe thresholds.`;
                const alertExists = notifications.some(n => n.message === message);

                if (!alertExists) {
                    if (riskScore >= 0.5) {
                        const isCritical = riskScore >= 0.8;
                        notifiedRegionsRef.current.add(alertKey);

                        addNotification({
                            type: 'risk',
                            level: isCritical ? 'critical' : 'warning',
                            title: isCritical ? `CRITICAL RISK: ${displayName.toUpperCase()}` : `RISK WARNING: ${displayName.toUpperCase()}`,
                            message: message
                        });
                    }
                }
            });
        } catch (error) {
            console.error('RiskMonitor: Failed to check reforestation risk', error);
        }
    }, [addNotification, notifications]);

    useEffect(() => {
        // Initial check on mount (login/app start)
        checkRisk();

        // Setup periodic check
        const interval = setInterval(checkRisk, RISK_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, []); // Only on mount and interval (no checkRisk dependency to prevent loops)

    return null; // This is a background monitor component
};

export default RiskMonitor;
