import React, { useEffect, useRef, useMemo } from 'react';
import { useMap, Tooltip, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { regionCoordinates } from '../../data/regionCoordinates';

const ClimateHeatmapLayer = ({ isVisible, selectedRegion, data, type, color, positionIndex = 0, regionPolygon }) => {
    const map = useMap();
    const layerGroupRef = useRef(L.layerGroup());
    const markersRef = useRef([]);

    // 🎯 Anti-Gravity: Shared CSS for Climate Particles
    useEffect(() => {
        const styleId = 'climate-heatmap-particle-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .climate-particle {
                    mix-blend-mode: screen; 
                    pointer-events: none;
                    filter: blur(3px);
                    transition: opacity 0.5s ease;
                }
                .climate-tooltip-professional {
                    background: white !important;
                    border: none !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    border-radius: 6px !important;
                    padding: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const item = data[type];
    const value = item?.val || '—';
    const status = item?.status || 'Active';

    // Calculate position with offset
    const coords = useMemo(() => {
        if (!selectedRegion || !regionCoordinates[selectedRegion]) return null;
        const base = regionCoordinates[selectedRegion];
        const offsetLat = positionIndex === 0 ? 0 : (positionIndex === 1 ? 0.025 : -0.025);
        const offsetLng = positionIndex === 0 ? 0 : 0.045;
        return [base[0] + offsetLat, base[1] + offsetLng];
    }, [selectedRegion, positionIndex]);

    // Render Heatmap Particles
    useEffect(() => {
        if (!map || !isVisible || !coords || !item) {
            if (layerGroupRef.current) layerGroupRef.current.clearLayers();
            markersRef.current = [];
            return;
        }

        layerGroupRef.current.addTo(map);
        layerGroupRef.current.clearLayers();

        const getRand = (s) => (Math.abs(Math.sin(s) * 10000) % 1.0);

        // Configuration for the particle distribution
        const maxAttempts = 200; // Increased attempts to fill polygon
        const targetParticleCount = 60; // Denser cloud
        const spreadRadius = 0.06; // Larger initial spread, will be clipped

        let addedParticles = 0;
        let attempts = 0;

        // Extract geometry if it exists
        let geom = null;
        if (regionPolygon) {
            geom = regionPolygon.features?.[0]?.geometry || regionPolygon.geometry || regionPolygon;
        }

        while (addedParticles < targetParticleCount && attempts < maxAttempts) {
            attempts++;
            const seed = (coords[0] + coords[1]) * 1000 + addedParticles + attempts;
            const rFactor = Math.sqrt(getRand(seed));
            const theta = getRand(seed + 1.2) * 2 * Math.PI;

            const lat = coords[0] + (rFactor * spreadRadius * Math.cos(theta));
            const lng = coords[1] + (rFactor * spreadRadius * Math.sin(theta));

            // 🎯 Anti-Gravity: Polygon Clipping Logic
            let isInside = true;
            if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
                try {
                    isInside = booleanPointInPolygon(point([lng, lat]), geom);
                } catch (e) {
                    console.warn("Polygon clipping error:", e);
                }
            } else if (regionPolygon) {
                // If geometry is present but not a polygon, fallback to a smaller radius to stay "near"
                isInside = rFactor < 0.6;
            }

            if (isInside) {
                L.circleMarker([lat, lng], {
                    radius: 8 + (getRand(seed + 2) * 10),
                    fillColor: color,
                    fillOpacity: (0.12 + getRand(seed + 3) * 0.15) * (1 - rFactor),
                    stroke: false,
                    interactive: false,
                    className: 'climate-particle'
                }).addTo(layerGroupRef.current);
                addedParticles++;
            }
        }

        return () => {
            if (layerGroupRef.current) layerGroupRef.current.clearLayers();
        };
    }, [map, isVisible, coords, item, color, regionPolygon]);

    if (!isVisible || !coords || !item) return null;

    return (
        <CircleMarker
            center={coords}
            radius={20}
            pathOptions={{
                color: 'transparent',
                fillColor: 'transparent',
                weight: 0,
                opacity: 0
            }}
        >
            <Tooltip permanent direction="top" offset={[0, -15]} className="climate-tooltip-professional">
                <div style={{
                    padding: '6px 10px',
                    textAlign: 'center',
                    minWidth: '80px',
                    borderBottom: `4px solid ${color}`
                }}>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{type}</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '2px 0' }}>{value}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: color }}>{status}</div>
                </div>
            </Tooltip>
        </CircleMarker>
    );
};

export default ClimateHeatmapLayer;
