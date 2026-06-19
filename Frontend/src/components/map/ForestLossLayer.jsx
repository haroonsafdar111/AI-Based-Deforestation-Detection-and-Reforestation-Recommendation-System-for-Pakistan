import React, { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ForestLossLayer = ({ isVisible, data, yearRange, canopyDensity }) => {
    const map = useMap();
    const layerGroupRef = useRef(L.layerGroup());
    const markersRef = useRef([]);

    // Shared CSS for Forest Loss particles (Blur + Organic Look)
    useEffect(() => {
        const styleId = 'forest-loss-marker-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .loss-particle {
                    mix-blend-mode: normal; 
                    pointer-events: none;
                    filter: blur(3px);
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(d => d.type === 'loss' && d.year <= yearRange && d.density >= canopyDensity);
    }, [data, yearRange, canopyDensity]);

    const getLossColor = (year) => {
        if (year >= 2020) return '#fb923c'; // Recent: Orange
        if (year >= 2010) return '#ef4444'; // Mid: Red
        return '#991b1b'; // Historical: Dark Red
    };

    useEffect(() => {
        if (!map || !isVisible || filteredData.length === 0) {
            layerGroupRef.current.clearLayers();
            markersRef.current = [];
            if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
            return;
        }

        layerGroupRef.current.clearLayers();
        layerGroupRef.current.addTo(map);

        const getRand = (s) => (Math.abs(Math.sin(s) * 10000) % 1.0);
        const currentZoom = map.getZoom();
        const zoomScale = Math.max(Math.pow(2, currentZoom - 12), 0.5);
        
        const newMarkers = [];

        filteredData.forEach(p => {
            const color = getLossColor(p.year);
            const intensity = p.density / 100;
            
            // Generate multiple particles per data point for a heatmap/organic effect
            const particleCount = Math.floor(10 + intensity * 20);
            const center = map.latLngToLayerPoint([p.lat, p.lng]);
            const spreadRadius = intensity * 15 + 5;

            for (let i = 0; i < particleCount; i++) {
                const seed = (p.lat + p.lng) * 1000 + i;
                const rFactor = Math.sqrt(getRand(seed));
                const theta = getRand(seed + 1.2) * 2 * Math.PI;

                const offsetX = rFactor * Math.cos(theta);
                const offsetY = rFactor * Math.sin(theta);

                const markerLatLng = map.layerPointToLatLng([
                    center.x + offsetX * spreadRadius * zoomScale,
                    center.y + offsetY * spreadRadius * zoomScale
                ]);

                const marker = L.circleMarker(markerLatLng, {
                    radius: (8 + getRand(seed + 2) * 8) * zoomScale,
                    fillColor: color,
                    fillOpacity: (0.2 + getRand(seed + 3) * 0.3) * (1 - rFactor),
                    stroke: false,
                    interactive: false,
                    className: 'loss-particle'
                }).addTo(layerGroupRef.current);

                newMarkers.push(marker);
            }
        });

        markersRef.current = newMarkers;

        return () => {
            if (layerGroupRef.current) layerGroupRef.current.clearLayers();
            if (map && map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
        };
    }, [map, isVisible, filteredData]);

    return null; // Layer logic is handled manually via Leaflet
};

export default ForestLossLayer;
