import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { riskZoneApi } from '../../services/riskZoneApi';

const RiskZoneLayer = ({ region, isVisible, zones: propZones, regionPolygon: propRegionPolygon, opacity = 0.7 }) => {
    const map = useMap();
    const [internalZones, setInternalZones] = useState([]);
    const [internalPolygon, setInternalPolygon] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [thresholds, setThresholds] = useState({ high: 0.7, medium: 0.4 });

    // Zoom State with Guard
    const [currentZoom, setCurrentZoom] = useState(10);
    const lastZoomRef = useRef(10);

    const cache = useRef({});
    const layerGroupRef = useRef(L.layerGroup());
    const markersRef = useRef([]); // Store markers for recycling
    const polygonLayerRef = useRef(null);
    const legendRef = useRef(null);
    const zoomedDataRef = useRef(null);
    const zoomTimer = useRef(null);

    // 🎯 Anti-Gravity: Performance-Optimized Map Sync
    useEffect(() => {
        if (!map) return;

        // Initial Sync
        const z = map.getZoom();
        setCurrentZoom(z);
        lastZoomRef.current = z;

        const initialTimer = setTimeout(() => setReady(true), 400);

        const handleZoom = () => {
            if (zoomTimer.current) clearTimeout(zoomTimer.current);
            zoomTimer.current = setTimeout(() => {
                const newZoom = map.getZoom();
                // 🛡️ Zoom Threshold Guard: Prevent micro-stutter
                if (Math.abs(newZoom - lastZoomRef.current) >= 0.25) {
                    setCurrentZoom(newZoom);
                    lastZoomRef.current = newZoom;
                }
            }, 100);
        };

        map.on('zoomend', handleZoom);

        return () => {
            clearTimeout(initialTimer);
            if (zoomTimer.current) clearTimeout(zoomTimer.current);
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    // 🎯 Anti-Gravity: Shared CSS Definitions
    useEffect(() => {
        const styleId = 'risk-zone-marker-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .risk-particle {
                    /* Normal blending for guaranteed visibility */
                    mix-blend-mode: normal; 
                    pointer-events: none;
                    filter: blur(2px); /* Subtle blur for organic look without washing out */
                }
                /* Apply will-change to optimize heavy filter/transform layers */
                .leaflet-zoom-animated {
                    will-change: transform, filter;
                }
                .risk-legend {
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(4px);
                    box-shadow: 0 0 15px rgba(0,0,0,0.2);
                    border-radius: 8px;
                    font-size: 12px;
                    color: #333;
                    line-height: 1.5;
                    margin-right: 125px !important;
                    margin-bottom: 30px !important;
                }
                .legend-item { display: flex; align-items: center; margin-bottom: 4px; }
                .legend-color { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const zones = propZones || internalZones;
    const regionPolygon = propRegionPolygon || internalPolygon;

    // 1a. Fetch Thresholds Configuration
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await riskZoneApi.getConfig();
                if (config && config.deforestationRisk) {
                    setThresholds({
                        high: config.deforestationRisk.high / 100,
                        medium: config.deforestationRisk.medium / 100
                    });
                }
            } catch (err) {
                console.error("RiskZoneLayer: Config fetch failed", err);
            }
        };
        fetchConfig();
    }, []);

    // 1b. Fetch Zone Data Logic
    useEffect(() => {
        if (propZones || !region || region === 'All Regions' || region === 'Pakistan' || !isVisible) return;
        if (cache.current[region]) {
            setInternalZones(cache.current[region].zones);
            setInternalPolygon(cache.current[region].geometry);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await riskZoneApi.fetchRiskZones(region);
                if (response?.zones) {
                    cache.current[region] = response;
                    setInternalZones(response.zones);
                    setInternalPolygon(response.geometry);
                }
            } catch (err) {
                console.error("RiskZoneLayer: Fetch failed", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [region, isVisible, propZones]);

    // 2. Data Processing (Memoized)
    const riskPoints = useMemo(() => {
        if (!Array.isArray(zones) || zones.length === 0) return [];

        const points = zones.map(z => ({
            lat: Number(z.lat),
            lng: Number(z.lng),
            risk: Number(z.risk_score || 0)
        })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && isFinite(p.lat));

        if (points.length === 0) {
            console.warn(`[RISK_LAYER] Zero points after mapping zones for ${region || 'Prop'}`);
            return [];
        }

        let minR = points[0].risk, maxR = points[0].risk;
        points.forEach(p => {
            if (p.risk < minR) minR = p.risk;
            if (p.risk > maxR) maxR = p.risk;
        });

        const range = maxR - minR || 1;
        if (propZones) {
            console.info(`[RISK_LAYER] AI_LINK CONFIRMED: Data source transitioned to Live Analysis results.`);
        }

        const processed = points.map(p => ({
            lat: p.lat, lng: p.lng,
            intensity: 0.25 + ((p.risk - minR) / range) * 0.75 // Increased contrast
        }));

        if (regionPolygon) {
            let geom = regionPolygon.features?.[0]?.geometry || regionPolygon.geometry || regionPolygon;
            if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                // Anti-Gravity: Relaxed filtering - only log warning if significantly missing
                const filtered = processed.filter(p => {
                    try {
                        return booleanPointInPolygon(point([p.lng, p.lat]), geom);
                    } catch (e) {
                        return true; // Fallback to showing point if geometry check fails
                    }
                });

                if (filtered.length === 0 && processed.length > 0) {
                    console.warn(`[RISK_LAYER] Filtering results: ${processed.length} points processed, boundary check applied.`);
                    // If everything filtered out, it's likely a precision issue. Return all points.
                    return processed; 
                }
                return filtered;
            }
        }
        return processed;
    }, [zones, regionPolygon]);

    const getRiskColor = (intensity) => {
        // Use dynamic thresholds for color mapping
        const { high, medium } = thresholds;

        if (intensity < medium) {
            // Low risk (Yellowish-White to Yellow)
            const f = intensity / medium;
            return `rgb(255, ${Math.round(245 - f * 21)}, ${Math.round(200 - f * 70)})`;
        } else if (intensity < high) {
            // Medium Risk (Yellow to Orange)
            const f = (intensity - medium) / (high - medium);
            return `rgb(255, ${Math.round(224 - f * 84)}, ${Math.round(130 - f * 130)})`;
        } else {
            // High Risk (Orange to Deep Red)
            const f = Math.min(1, (intensity - high) / (1 - high || 0.1));
            return `rgb(${Math.round(255 - f * 35)}, ${Math.round(140 - f * 140)}, 0)`;
        }
    };

    // 3. UI Overlays
    useEffect(() => {
        if (!map || !isVisible || !ready || !region || region === 'Pakistan' || region === 'All Regions') return;

        const Legend = L.Control.extend({
            onAdd: () => {
                const div = L.DomUtil.create('div', 'risk-legend');
                const h = Math.round(thresholds.high * 100);
                const m = Math.round(thresholds.medium * 100);
                div.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 8px;">Deforestation Risk</div>
                    <div class="legend-item"><div class="legend-color" style="background: #D32F2F;"></div> High Risk (>${h}%)</div>
                    <div class="legend-item"><div class="legend-color" style="background: #FF9800;"></div> Medium Risk (>${m}%)</div>
                    <div class="legend-item"><div class="legend-color" style="background: #FFE082;"></div> Low Risk</div>
                `;
                return div;
            }
        });
        const legendInstance = new Legend({ position: 'bottomright' }).addTo(map);
        legendRef.current = legendInstance;

        let outlineLayer = null;
        if (regionPolygon) {
            if (!map.getPane('riskOutlinePane')) {
                map.createPane('riskOutlinePane').style.zIndex = 460;
            }
            outlineLayer = L.geoJSON(regionPolygon, {
                pane: 'riskOutlinePane',
                style: { color: '#22c55e', weight: 2.5, opacity: 0.9, fill: false }
            }).addTo(map);
            polygonLayerRef.current = outlineLayer;
        }

        return () => {
            if (legendInstance) map.removeControl(legendInstance);
            if (outlineLayer) map.removeLayer(outlineLayer);
            legendRef.current = null;
            polygonLayerRef.current = null;
        };
    }, [map, isVisible, ready, regionPolygon, region]);

    // 4. Optimized Marker Recycling & Attribution Updates
    useEffect(() => {
        if (!map || !ready || !isVisible || riskPoints.length === 0) {
            if (layerGroupRef.current) layerGroupRef.current.clearLayers();
            markersRef.current = [];
            if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
            return;
        }

        // Always clear existing layers before adding new recycled ones
        if (layerGroupRef.current) layerGroupRef.current.clearLayers();

        layerGroupRef.current.addTo(map);

        const getRand = (s) => (Math.abs(Math.sin(s) * 10000) % 1.0);
        const MAX_TOTAL = 3000;
        const baseCountPerPoint = 25 + (400 / Math.sqrt(riskPoints.length));
        const densityFactor = Math.min(1, MAX_TOTAL / (riskPoints.length * baseCountPerPoint));

        console.log(`[RISK_LAYER] Rendering ${riskPoints.length} points for ${region || 'PropZones'}`);

        const newMarkers = [];

        riskPoints.forEach(p => {
            const color = getRiskColor(p.intensity);
            const count = Math.floor((15 + p.intensity * 25) * densityFactor); // Reduced count per cluster
            const center = map.latLngToLayerPoint([p.lat, p.lng]);
            const spreadRadiusBase = p.intensity * 10 + 5; // Ultra-tight clusters for hotspots

            for (let i = 0; i < count; i++) {
                const seed = (p.lat + p.lng) * 1000 + i;
                const rFactor = Math.sqrt(getRand(seed));
                const theta = getRand(seed + 1.2) * 2 * Math.PI;

                const offsetX = rFactor * Math.cos(theta);
                const offsetY = rFactor * Math.sin(theta);

                const markerLatLng = map.layerPointToLatLng([
                    center.x + offsetX * (spreadRadiusBase * Math.max(Math.pow(2, currentZoom - 12), 0.6)),
                    center.y + offsetY * (spreadRadiusBase * Math.max(Math.pow(2, currentZoom - 12), 0.6))
                ]);

                const marker = L.circleMarker(markerLatLng, {
                    // Reverted to default overlayPane for bulletproof compatibility
                    radius: 12.5, // Slightly larger for visual weight
                    fillColor: color,
                    fillOpacity: opacity * (0.30 + getRand(seed + 3.2) * 0.15) * (1 - rFactor), // Higher base opacity
                    stroke: false,
                    interactive: false,
                    className: 'risk-particle'
                }).addTo(layerGroupRef.current);

                newMarkers.push({ marker, seed });
            }
        });

        markersRef.current = newMarkers;

        return () => {
            markersRef.current.forEach(m => m.marker.removeFrom(layerGroupRef.current));
            markersRef.current = [];
            if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
        };
    }, [map, ready, isVisible, riskPoints, opacity]);

    // 5. Lightweight Zoom Attribute Updates
    useEffect(() => {
        if (!map || markersRef.current.length === 0) return;

        const zoomScale = Math.pow(2, currentZoom - 12);
        const dampenedScale = Math.sqrt(Math.max(zoomScale, 0.6));

        // Remove blur property updates - not used in pointillism
        markersRef.current.forEach(({ marker, seed }) => {
            const jitter = (Math.abs(Math.sin(seed + 2.2) * 10000) % 1.0);
            marker.setRadius((6.0 + jitter * 6.0) * dampenedScale); // Sharper markers
        });
    }, [currentZoom]);

    // 6. Auto-Zoom
    useEffect(() => {
        if (!map || !isVisible) return;
        const trigger = regionPolygon || riskPoints;
        if (zoomedDataRef.current === trigger) return;
        try {
            let bounds = null;
            if (regionPolygon) {
                const gj = L.geoJSON(regionPolygon);
                if (gj.getLayers().length > 0) bounds = gj.getBounds();
            } else if (riskPoints.length > 0) {
                bounds = L.latLngBounds(riskPoints.map(p => [p.lat, p.lng]));
            }
            if (bounds?.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                zoomedDataRef.current = trigger;
            }
        } catch (e) { }
    }, [map, riskPoints, regionPolygon, isVisible]);

    return null;
};

export default RiskZoneLayer;
