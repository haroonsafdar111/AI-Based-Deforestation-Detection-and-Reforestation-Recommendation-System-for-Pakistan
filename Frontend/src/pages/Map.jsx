import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useTranslation } from '../context/LanguageContext'
import { useNotification } from '../context/NotificationContext'
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents, Polygon, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRegions, fetchRegionData, fetchMapForestData, searchLocation, extractPointDetails } from '../services/api.js'
import { mlService } from '../services/mlService.js'
import RiskZoneLayer from '../components/map/RiskZoneLayer'
import ForestLossLayer from '../components/map/ForestLossLayer'
import ClimateHeatmapLayer from '../components/map/ClimateHeatmapLayer'
import { reportService } from '../services/reportService.js'
import { riskZoneApi } from '../services/riskZoneApi.js'
import { authService } from '../services/authService'
import { pakistanRegions, getAllLocations } from '../data/pakistanRegions'
import { regionCoordinates } from '../data/regionCoordinates'
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Map Controls Component
function MapControls({ onSettingsClick }) {
  const map = useMap()

  const handleZoomIn = () => {
    map.zoomIn()
  }

  const handleZoomOut = () => {
    map.zoomOut()
  }

  const handleFullscreen = () => {
    const mapContainer = map.getContainer().parentElement
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch(err => {
        alert(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleShare = () => {
    const center = map.getCenter()
    const zoom = map.getZoom()
    const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}`

    if (navigator.share) {
      navigator.share({
        title: 'ForestVision Map',
        text: 'Check out this forest monitoring map',
        url: url
      }).catch(err => console.log('Error sharing:', err))
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Map link copied to clipboard!')
      }).catch(err => {
        alert('Failed to copy link. Please copy manually: ' + url)
      })
    }
  }

  return (
    <div className="map-controls">
      <button className="map-control-btn" onClick={handleZoomIn} aria-label="Zoom in">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button className="map-control-btn" onClick={handleZoomOut} aria-label="Zoom out">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button className="map-control-btn" onClick={handleFullscreen} aria-label="Fullscreen">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      </button>
      <button className="map-control-btn" onClick={handleShare} aria-label="Share">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
    </div>
  )
}

// Use centralized coordinates
const regionsData = regionCoordinates;

const MapRegionController = ({ selectedRegion, trigger }) => {
  const map = useMap()
  useEffect(() => {
    if (selectedRegion && regionsData[selectedRegion]) {
      const data = regionsData[selectedRegion]
      const lat = data[0]
      const lng = data[1]
      const zoom = data[2] || 8
      map.flyTo([lat, lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
  }, [selectedRegion, map, trigger])
  return null
}

const ClimateRegionController = ({ selectedRegion, trigger }) => {
  const map = useMap()
  useEffect(() => {
    if (selectedRegion && regionsData[selectedRegion]) {
      const data = regionsData[selectedRegion]
      const lat = data[0]
      const lng = data[1]
      const zoom = data[2] || 8
      map.flyTo([lat, lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
  }, [selectedRegion, map, trigger])
  return null
}

// Controller to handle coordinate-based navigation from outside MapContainer
const MapCoordinateController = ({ coords, trigger }) => {
  const map = useMap()
  useEffect(() => {
    if (!coords) return;

    let lat, lng;
    if (Array.isArray(coords) && coords.length >= 2) {
      [lat, lng] = coords;
    } else if (typeof coords === 'object' && coords.lat !== undefined && coords.lng !== undefined) {
      lat = coords.lat;
      lng = coords.lng;
    }

    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], 10, {
        duration: 1.5
      });
    }
  }, [coords, map, trigger])
  return null
}

// Controller to expose map methods to parent without ref passing hell
const MapSearchController = ({ onSearch }) => {
  const map = useMap()
  // We don't actually need to expose map up if we just pass handleMapSearch down...
  // Wait, handleMapSearch is in Parent (Map), which DOES NOT have access to 'map' instance 
  // because MapContainer creates the context.

  // Correction: We need to move the search logic INSIDE a child component of MapContainer
  // OR use a ref.

  // Easier approach: The SearchPanel IS outside MapContainer (visually overlay), but typically
  // interacting with map requires access.
  // Actually, SearchPanel is rendered INSIDE MapContainer in my code structure above.
  // So 'handleMapSearch' defined in 'Map' component (which is OUTSIDE context) will fail if it tries to use 'map'.

  // REFACTOR: 'Map' component renders MapContainer. 'Map' component state holds active panel.
  // 'handleMapSearch' needs to affect the map. 
  // The 'SearchPanel' is inside MapContainer children in my previous ReplaceFileContent?
  // Let me check... yes it is. 

  // If SearchPanel is inside MapContainer, then it can just useMap() directly!
  // I will refactor SearchPanel to use useMap() and handle navigation internally.
  return null
}

const ReportPanel = ({ isOpen, onClose, selectedRegion, featureData, mlResults }) => {
  if (!isOpen) return null

  // State for report options
  const [options, setOptions] = useState({
    statistics: true,
    charts: true,
    maps: true
  })

  const [format, setFormat] = useState('pdf')

  // NEW: Report Service Integration
  // Report Service is already imported at top level
  // const { reportService } = require('../services/reportService.js');
  const [isGenerating, setIsGenerating] = useState(false);
  const { addNotification } = useNotification();

  const toggleOption = (option) => {
    setOptions(prev => ({ ...prev, [option]: !prev[option] }))
  }

  const generateReport = async (type) => {
    setIsGenerating(true);
    try {
      // Map featureData to a generic summary format the backend expects
      const environmentalSummary = {
        avgTemp: parseFloat(featureData.temperature.val) || 25.5,
        totalRain: parseFloat(featureData.rainfall.val) || 120.4,
        avgHumidity: parseFloat(featureData.soilMoisture.val) || 60.2,
        ndvi: parseFloat(featureData.ndvi.val) || 0.5,
        lst: parseFloat(featureData.lst.val) || 30.0,
        elevation: parseFloat(featureData.elevation.val) || 0
      };

      await reportService.generateReport({
        region: selectedRegion || 'Custom Area',
        timeRange: { start: '2023-01-01', end: '2024-01-01' },
        mlResults: mlResults,
        format: format,
        options: options,
        data: {
          preprocessedData: {
            summary: environmentalSummary
          }
        }
      });

      const storageKey = getUserKey('savedReports');
      const savedReports = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newReport = {
        id: `rep-${Date.now()}`,
        name: `${selectedRegion || 'Custom Area'} Report`,
        type: 'environmental',
        date: new Date().toISOString(),
        format: format
      };
      localStorage.setItem(storageKey, JSON.stringify([...savedReports, newReport]));

      addNotification({ type: 'success', message: 'Report generated and saved to your account!' });
    } catch (err) {
      console.error("Report generation failed:", err);
      addNotification({ type: 'error', message: "Failed to generate report. Please try again." });
    } finally {
      setIsGenerating(false);
    }
  }

  const ButtonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#84cc16',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: isGenerating ? 'wait' : 'pointer',
    opacity: isGenerating ? 0.7 : 1,
    marginBottom: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }

  return (
    <div className="map-settings-panel" style={{ top: '80px', left: '80px', bottom: 'auto', right: 'auto', width: '300px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REPORT CENTER</h3>
        <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          ×
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>Select Format</h4>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setFormat('pdf')}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: format === 'pdf' ? 'white' : 'transparent', color: format === 'pdf' ? '#10b981' : '#64748b', boxShadow: format === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            PDF Report
          </button>
          <button
            onClick={() => setFormat('csv')}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: format === 'csv' ? 'white' : 'transparent', color: format === 'csv' ? '#10b981' : '#64748b', boxShadow: format === 'csv' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            CSV Data
          </button>
        </div>

        <button style={ButtonStyle} onClick={() => generateReport('default')} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              GENERATE REPORT
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Configurations</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={options.statistics}
            onChange={() => toggleOption('statistics')}
            style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
          />
          Include statistics
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={options.charts}
            onChange={() => toggleOption('charts')}
            style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
          />
          Include charts
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={options.maps}
            onChange={() => toggleOption('maps')}
            style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
          />
          Include maps
        </label>
      </div>
    </div>
  )
}
const SearchPanelContent = ({ setSelectedRegion, setViewCoords, handleSaveArea, onAnalysis, analysisResults, isAnalysisLoading, onClear, selectedRegion, navTrigger, setNavTrigger, recentSearches, onSearch, showRecommendations }) => {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('location')
  const [searchQuery, setSearchQuery] = useState('')
  const [coords, setCoords] = useState({ lat: '', lng: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleManualSearch = async (query) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    const success = await onSearch(query, true);
    if (!success) {
      setError(`Location "${query}" not found.`);
    }
    setIsLoading(false);
  }

  const handleCoordSearch = () => {
    const lat = parseFloat(coords.lat)
    const lng = parseFloat(coords.lng)

    if (!isNaN(lat) && !isNaN(lng)) {
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Find matching region from regionsData with 0.05 tolerance
        const matchedRegion = Object.keys(regionsData).find(name => {
          const regionInfo = regionsData[name];
          if (!regionInfo || regionInfo.length < 2) return false;
          return Math.abs(regionInfo[0] - lat) < 0.05 && Math.abs(regionInfo[1] - lng) < 0.05;
        });

        if (matchedRegion && matchedRegion !== 'Pakistan' && matchedRegion !== 'All Regions') {
          setViewCoords({ lat, lng });
          setSelectedRegion(matchedRegion);
          onAnalysis('all', matchedRegion, true);
          setNavTrigger(prev => prev + 1);
          addNotification({ type: 'success', message: `Location verified: ${matchedRegion}` });
        } else {
          // Navigate to the point but don't trigger analysis that will fail
          setViewCoords({ lat, lng });
          setSelectedRegion(null);
          setNavTrigger(prev => prev + 1);
          addNotification({
            type: 'warning',
            message: 'AI analysis is currently only available for recognized forest regions in the list.'
          });
        }
      } else {
        alert('Invalid coordinates. Lat: -90 to 90, Lng: -180 to 180.')
      }
    } else {
      alert('Please enter valid numbers for latitude and longitude.')
    }
  }

  return (
    <div className="panel-content">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('location')}
          style={{
            flex: 1, padding: '8px 12px', border: 'none',
            backgroundColor: '#333',
            borderBottom: activeTab === 'location' ? '3px solid #84cc16' : '3px solid transparent',
            color: activeTab === 'location' ? '#84cc16' : 'white',
            fontWeight: 'bold', cursor: 'pointer',
            textTransform: 'uppercase',
            fontSize: '11px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (activeTab !== 'location') e.currentTarget.style.backgroundColor = '#555' }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#333' }}
        >
          LOCATIONS
        </button>
        <button
          onClick={() => setActiveTab('coordinates')}
          style={{
            flex: 1, padding: '8px 12px', border: 'none',
            backgroundColor: '#333',
            borderBottom: activeTab === 'coordinates' ? '3px solid #84cc16' : '3px solid transparent',
            color: activeTab === 'coordinates' ? '#84cc16' : 'white',
            fontWeight: 'bold', cursor: 'pointer',
            textTransform: 'uppercase',
            fontSize: '11px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (activeTab !== 'coordinates') e.currentTarget.style.backgroundColor = '#555' }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#333' }}
        >
          COORDINATES
        </button>
      </div>

      {activeTab === 'location' ? (
        <>
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px', textTransform: 'uppercase' }}>Search Locations</h4>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. manshera"
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', outline: 'none',
                opacity: isLoading ? 0.7 : 1
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch(searchQuery)}
            />
            <button
              onClick={() => handleManualSearch(searchQuery)}
              disabled={isLoading}
              style={{
                backgroundColor: '#84cc16', color: 'white', border: 'none', borderRadius: '4px', width: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              )}
            </button>
          </div>

          {error && (
            <div style={{ padding: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '4px', fontSize: '12px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* ML RESULTS DISPLAY */}

          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Recent Searches</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentSearches.map((term, idx) => (
                <div key={`${term}-${idx}`} style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setSearchQuery(term);
                      handleManualSearch(term);
                    }}
                    style={{
                      flex: 1, textAlign: 'left', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '4px', fontSize: '14px', color: '#333', cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    {term}
                  </button>
                  <button
                    onClick={() => handleSaveArea(term, 'search')}
                    style={{
                      padding: '0 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Save this location"
                  >
                    <span style={{ fontSize: '16px', color: '#16a34a' }}>+</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px', textTransform: 'uppercase' }}>Search Coordinates</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 34.3333"
                value={coords.lat}
                onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 73.2000"
                value={coords.lng}
                onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={handleCoordSearch}
              style={{
                marginTop: '8px', padding: '12px', backgroundColor: '#84cc16', color: 'white', border: 'none',
                borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Go to Location
            </button>
          </div>
        </>
      )}

      {/* ML RESULTS DISPLAY (Common to both tabs) */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
        {isAnalysisLoading && (
          <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '4px', fontSize: '12px', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #166534', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Calculating Area Metrics...
          </div>
        )}

        {analysisResults && (
          <>
            <div style={{ marginBottom: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📍</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>{selectedRegion || 'Current Location'}</span>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                <span>AI ANALYSIS</span>
                <span style={{ fontSize: '10px', backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '10px' }}>Live</span>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Risk Score:</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: analysisResults.risk_score > 0.5 ? '#ef4444' : '#10b981' }}>{(analysisResults.risk_score * 100).toFixed(0)}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Confidence:</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{(analysisResults.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Scoped Detailed Recommendations - Separate Second Card */}
            {showRecommendations && (
              <div className="recommendations-box" style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginTop: '12px',
                marginBottom: '16px',
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🌱</span> AI Detailed Suggestions
                </h5>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                  {analysisResults.reforestation_recommendations && analysisResults.reforestation_recommendations.map((seed, idx) => (
                    <li key={idx} style={{
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: '#14532d',
                      borderBottom: idx === analysisResults.reforestation_recommendations.length - 1 ? 'none' : '1px dashed #dcfce7',
                      paddingBottom: '8px'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>{seed}</div>
                    </li>
                  ))}
                </ul>
                <div style={{ fontSize: '10px', color: '#166534', fontStyle: 'italic', marginTop: '4px', textAlign: 'center' }}>
                  Optimized for current regional characteristics
                </div>
              </div>
            )}
          </>
        )}

        <button
          className="analysis-action-btn clear"
          onClick={onClear}
          style={{ marginTop: '8px', width: '100%', display: analysisResults ? 'flex' : 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          Clear Map Layers
        </button>
      </div>
    </div >
  )
}

const MapSettingsPanel = ({ isOpen, onClose, settings, onSettingChange, mapStyle, onMapStyleChange }) => {
  if (!isOpen) return null

  return (
    <div className="map-settings-panel" style={{
      position: 'absolute',
      right: '60px',
      top: '120px',
      backgroundColor: 'white',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      width: '280px',
      zIndex: 1000,
      padding: '16px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Map Settings</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
          </button>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => onSettingChange('politicalBoundaries')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '12px 4px', border: settings.politicalBoundaries ? '1px solid #97a3b6' : '1px solid #eee',
            backgroundColor: settings.politicalBoundaries ? '#f1f5f9' : 'white', borderRadius: '4px', cursor: 'pointer', height: '80px'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ marginBottom: '8px' }}>
            <path d="M2 12h20M12 2v20M15 5l-3 3-3-3M15 19l-3-3-3 3" />
          </svg>
          <span style={{ fontSize: '11px', textAlign: 'center', color: '#555', lineHeight: '1.2' }}>Political boundaries</span>
        </button>

        <button
          onClick={() => onSettingChange('showLabels')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '12px 4px', border: settings.showLabels ? '1px solid #97a3b6' : '1px solid #eee',
            backgroundColor: settings.showLabels ? '#f1f5f9' : 'white', borderRadius: '4px', cursor: 'pointer', height: '80px'
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontFamily: 'serif' }}>T</span>
          <span style={{ fontSize: '11px', textAlign: 'center', color: '#555' }}>Show labels</span>
        </button>

        <button
          onClick={() => onSettingChange('hideRoads')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '12px 4px', border: settings.hideRoads ? '1px solid #97a3b6' : '1px solid #eee',
            backgroundColor: settings.hideRoads ? '#f1f5f9' : 'white', borderRadius: '4px', cursor: 'pointer', height: '80px'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ marginBottom: '8px' }}>
            <path d="M8 2v20M16 2v20M12 10v4M4 14l4-4 4 4M20 10l-4 4-4-4" />
          </svg>
          <span style={{ fontSize: '11px', textAlign: 'center', color: '#555' }}>Hide Roads</span>
        </button>
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Map Styles</h4>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          onClick={() => onMapStyleChange('default')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{
            width: '60px', height: '60px', border: mapStyle === 'default' ? '3px solid #84cc16' : '1px solid #ddd',
            borderRadius: '2px', overflow: 'hidden', marginBottom: '4px'
          }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e6e6e6 0%, #ffffff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#aaa' }}>Light</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>DEFAULT</span>
        </div>

        <div
          onClick={() => onMapStyleChange('darkMatter')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{
            width: '60px', height: '60px', border: mapStyle === 'darkMatter' ? '3px solid #84cc16' : '1px solid #ddd',
            borderRadius: '2px', overflow: 'hidden', marginBottom: '4px'
          }}>
            <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#666' }}>Dark</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>DARK<br />MATTER</span>
        </div>
      </div>
    </div>
  )
}

function Map() {
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeTab, setActiveTab] = useState('LEGEND')
  const [thresholds, setThresholds] = useState({ high: 0.7, medium: 0.4 })

  useEffect(() => {
    riskZoneApi.getConfig().then(c => {
      if (c && c.deforestationRisk) {
        setThresholds({
          high: c.deforestationRisk.high / 100,
          medium: c.deforestationRisk.medium / 100
        });
      }
    }).catch(err => console.error(err));
  }, []);

  const [yearRange, setYearRange] = useState(2024)
  const [panelOpen, setPanelOpen] = useState(false)
  const [isPakistanOpen, setIsPakistanOpen] = useState(false)
  const [isClimateRegionOpen, setIsClimateRegionOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedClimateRegion, setSelectedClimateRegion] = useState(null)
  const [viewCoords, setViewCoords] = useState(null)
  const [navTrigger, setNavTrigger] = useState(0)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showSearchRecommendations, setShowSearchRecommendations] = useState(false)
  const [recentSearches, setRecentSearches] = useState([
    'Lahore',
    'Karachi',
    'Peshawar',
    'Quetta',
    'Islamabad',
    'Gilgit'
  ])
  const { t } = useTranslation()
  const { addNotification } = useNotification()
  const [canopyDensity, setCanopyDensity] = useState(30)

  const currentRegionRef = useRef(selectedRegion);
  useEffect(() => {
    currentRegionRef.current = selectedRegion;
  }, [selectedRegion]);

  const handleSaveArea = (areaName, type = 'region') => {
    if (!areaName || areaName.startsWith('---')) return

    const storageKey = getUserKey('savedAreas');
    const savedAreas = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const alreadySaved = savedAreas.find(area => area.name === areaName)

    if (alreadySaved) {
      addNotification({
        type: 'info',
        message: t('profile.alreadySaved')
      })
      return
    }

    const newArea = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: areaName,
      type: type,
      date: new Date().toISOString()
    }

    localStorage.setItem(storageKey, JSON.stringify([...savedAreas, newArea]))
    addNotification({
      type: 'success',
      message: t('profile.areaSaved')
    })
  }

  // NEW API States for Regional Metrics
  const [regionMetrics, setRegionMetrics] = useState(null)
  const [isRegionLoading, setIsRegionLoading] = useState(false)
  const [isClimateLoading, setIsClimateLoading] = useState(false)
  const [regionError, setRegionError] = useState(null)

  // NEW: ML Analysis State
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [searchAnalysisResults, setSearchAnalysisResults] = useState(null);
  const [mapForestData, setMapForestData] = useState([]);
  const [isMapForestLoading, setIsMapForestLoading] = useState(false);
  const [isSearchAnalysisLoading, setIsSearchAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [riskOpacity, setRiskOpacity] = useState(0.7); // New State for Opacity Control

  const location = useLocation()
  const navigate = useNavigate()

  // Sync Map Forest Data with Backend
  useEffect(() => {
    const syncForestData = async () => {
      if (selectedRegion && selectedRegion !== 'All Regions') {
        setIsMapForestLoading(true);
        try {
          const data = await fetchMapForestData(selectedRegion);
          if (data) setMapForestData(data);
        } catch (err) {
          console.error("Failed to sync forest map data:", err);
        } finally {
          setIsMapForestLoading(false);
        }
      } else if (!selectedRegion) {
        setMapForestData([]);
      }
    };
    syncForestData();
  }, [selectedRegion]);

  // Handler for Forest Analysis
  const handleForestAnalysis = async (type, targetRegion = null, isFromSearch = false) => {
    const regionToAnalyze = targetRegion || selectedRegion;

    if (!regionToAnalyze || regionToAnalyze === 'All Regions') {
      addNotification({
        type: 'info',
        message: 'Please select a specific region or enter a location first.'
      });
      return;
    }

    // Toggle logic if we already have data
    const currentResults = isFromSearch ? searchAnalysisResults : analysisResults;
    const currentShowRecs = isFromSearch ? showSearchRecommendations : showRecommendations;

    if (type === 'risk' && currentResults && layers.deforestationRisk && !targetRegion) {
      toggleLayer('deforestationRisk');
      return;
    }
    if (type === 'reforestation' && currentResults && currentShowRecs) {
      if (isFromSearch) setShowSearchRecommendations(false);
      else setShowRecommendations(false);
      toggleLayer('reforestationAreas');
      return;
    }

    // Call API - CACHE-FIRST strategy
    if (isFromSearch) setIsSearchAnalysisLoading(true);
    else setIsAnalysisLoading(true);

    setAnalysisError(null);
    try {
      // First try to fetch cached analysis
      console.log(`[Map] Fetching cached analysis for ${regionToAnalyze}...`);
      let results = await mlService.fetchLatestAnalysis(regionToAnalyze);

      if (results) {
        // Cache hit - use it immediately
        console.log(`[Map] Cached analysis found for ${regionToAnalyze}. Age: ${results.cache?.age_hours || 'unknown'} hours`);

        if (isFromSearch) setSearchAnalysisResults(results);
        else setAnalysisResults(results);
      } else {
        // Cache miss - trigger new prediction
        console.log(`[Map] No cached analysis for ${regionToAnalyze}. Triggering computation...`);
        const predictionResult = await mlService.getPrediction(regionToAnalyze);
        results = predictionResult.results;
        if (isFromSearch) setSearchAnalysisResults(results);
        else setAnalysisResults(results);
      }

      // Update Feature Data from Backend
      if (results && results.features) {
        const f = results.features;
        setFeatureData(prev => ({
          ...prev,
          ndvi: { ...prev.ndvi, val: f.ndvi?.toFixed(2) || prev.ndvi.val },
          evi: { ...prev.evi, val: f.evi?.toFixed(2) || prev.evi.val },
          lst: { ...prev.lst, val: (f.lst?.toFixed(1) || '0') + '°C' },
          soilMoisture: { ...prev.soilMoisture, val: (f.soilMoisture?.toFixed(0) || '0') + '%' },
          temperature: { ...prev.temperature, val: (f.temperature?.toFixed(1) || '0') + '°C' },
          rainfall: { ...prev.rainfall, val: (f.rainfall?.toFixed(1) || '0') + 'mm' },
          humidity: { ...prev.humidity, val: (f.humidity?.toFixed(0) || '0') + '%' },
          elevation: { ...prev.elevation, val: (f.elevation?.toFixed(0) || '0') + 'm' },
          soilType: { ...prev.soilType, val: 'Type ' + (f.soilType || '1') }
        }));
      }

      if (type === 'risk' || type === 'all') {
        if (!layers.deforestationRisk) toggleLayer('deforestationRisk');
      }
      if (type === 'reforestation' || type === 'all') {
        if (!layers.reforestationAreas) toggleLayer('reforestationAreas');
        if (isFromSearch) setShowSearchRecommendations(true);
        else setShowRecommendations(true);
      }

    } catch (err) {
      console.error("Analysis Failed:", err);
      addNotification({
        type: 'error',
        message: 'AI Analysis failed. Please try again.'
      });
    } finally {
      setIsAnalysisLoading(false);
      setIsSearchAnalysisLoading(false);
    }
  };



  // State for Sidebar Report Options
  const [sidebarOptions, setSidebarOptions] = useState({
    statistics: true,
    charts: true,
    maps: true
  });
  const [sidebarFormat, setSidebarFormat] = useState('pdf');

  const handleSidebarReport = async (type) => {
    addNotification({ type: 'info', message: 'Generating report...' });
    try {
      // Map featureData to a generic summary format the backend expects
      const environmentalSummary = {
        avgTemp: parseFloat(featureData.temperature.val) || 25.5,
        totalRain: parseFloat(featureData.rainfall.val) || 120.4,
        avgHumidity: parseFloat(featureData.soilMoisture.val) || 60.2,
        ndvi: parseFloat(featureData.ndvi.val) || 0.5,
        lst: parseFloat(featureData.lst.val) || 30.0,
        elevation: parseFloat(featureData.elevation.val) || 0
      };

      await reportService.generateReport({
        region: selectedRegion || 'Custom Area',
        timeRange: { start: '2023-01-01', end: '2024-01-01' },
        mlResults: searchAnalysisResults || analysisResults, // Use either search or region results
        format: sidebarFormat, // Use the selected format
        options: sidebarOptions, // Use user selected options
        data: {
          preprocessedData: {
            summary: environmentalSummary
          }
        }
      });
      addNotification({ type: 'success', message: `${sidebarFormat.toUpperCase()} report generated successfully!` });

      // Track the generated report in localStorage (User-Specific)
      const reportsKey = getUserKey('savedReports');
      const savedReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');
      const newReport = {
        id: `rep-${Date.now()}`,
        name: `${selectedRegion || 'Custom Area'} Sidebar Report`,
        type: 'environmental',
        date: new Date().toISOString(),
        format: sidebarFormat
      };
      localStorage.setItem(reportsKey, JSON.stringify([...savedReports, newReport]));
    } catch (err) {
      console.error("Sidebar Report Error:", err);
      addNotification({ type: 'error', message: "Failed to generate report." });
    }
  };

  const handleClearLayers = () => {
    setLayers(prev => ({
      ...prev,
      deforestationRisk: false,
      reforestationAreas: false
    }))
    setShowRecommendations(false)
    setShowSearchRecommendations(false)
    setAnalysisResults(null)
    setSearchAnalysisResults(null)
  }

  const handleMapSearch = async (query, isFromPanel = false) => {
    if (!query || !query.toString().trim()) return;

    // Handle coordinate objects
    if (typeof query === 'object' && query.lat && query.lng) {
      setViewCoords({ lat: query.lat, lng: query.lng });
      setSelectedRegion(null);
      setNavTrigger(prev => prev + 1);
      return;
    }

    // Handle string queries via API
    if (typeof query === 'string' && query.trim()) {
      try {
        const results = await searchLocation(query);
        if (results && results.length > 0) {
          const bestMatch = results[0];
          const regionId = bestMatch.id;

          setViewCoords({ lat: bestMatch.coords[0], lng: bestMatch.coords[1] });

          // Use specific region zoom if available
          if (regionsData[regionId]) {
            setSelectedRegion(regionId);
          } else {
            setSelectedRegion(null);
          }

          // Trigger refocus
          setNavTrigger(prev => prev + 1);

          // Update Search History (Recent Searches)
          const formalName = bestMatch.name;
          setRecentSearches(prev => {
            const filtered = prev.filter(item =>
              item.toLowerCase() !== regionId.toLowerCase() &&
              item.toLowerCase() !== formalName.toLowerCase() &&
              !formalName.toLowerCase().startsWith(item.toLowerCase())
            );
            return [regionId, ...filtered].slice(0, 5);
          });

          // Trigger Forest Analysis automatically if from search panel
          if (isFromPanel) {
            handleForestAnalysis('all', regionId, true);
          }

          return true; // Success
        } else {
          return false; // Not found
        }
      } catch (err) {
        console.error("Map Search Error:", err);
        return false;
      }
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const regionParam = params.get('region')
    const searchParam = params.get('search')

    if (regionParam) {
      setSelectedRegion(regionParam)
      setPanelOpen(true)
      setActiveCategory('REGION SELECTOR')
    } else if (searchParam) {
      handleMapSearch(searchParam)
      setPanelOpen(true)
      setActiveCategory('SEARCH')
    }
  }, [location.search])

  // Sync selectedRegion to selectedClimateRegion
  useEffect(() => {
    if (selectedRegion && selectedRegion !== 'All Regions') {
      setSelectedClimateRegion(selectedRegion);
    }
  }, [selectedRegion]);

  // Sync selectedClimateRegion to selectedRegion to keep the map and other selectors aligned
  useEffect(() => {
    if (selectedClimateRegion && selectedClimateRegion !== 'All Regions' && selectedClimateRegion !== selectedRegion) {
      setSelectedRegion(selectedClimateRegion);
    }
  }, [selectedClimateRegion]);

  useEffect(() => {
    if (!selectedRegion || selectedRegion === 'All Regions') return;

    const loadRegionData = async () => {
      setIsRegionLoading(true)
      setRegionError(null)
      try {
        const data = await fetchRegionData(selectedRegion)
        setRegionMetrics(data)
      } catch (err) {
        console.error("Regional API Error:", err)
        setRegionError("Failed to fetch detailed metrics for " + selectedRegion)
      } finally {
        setIsRegionLoading(false)
      }
    }
    loadRegionData()
  }, [selectedRegion])

  // NEW: Fetch Risk Data & Geometry when region changes
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    if (!selectedRegion || selectedRegion === 'All Regions') {
      setRiskData(null);
      return;
    }

    const loadRiskData = async () => {
      // Don't block UI, just fetch in background or parallel
      try {
        // riskZoneApi imported at top (Need to ensure import)
        // Note: We need to import riskZoneApi if not present. 
        // Assuming I'll add the import in the next tool call or usage
        const result = await import('../services/riskZoneApi').then(m => m.riskZoneApi.fetchRiskZones(selectedRegion));
        setRiskData(result);
      } catch (err) {
        console.error("Failed to load risk data geometry", err);
      }
    };

    loadRiskData();
  }, [selectedRegion]);

  // Environmental Features State
  const [selectedFeaturesRegion, setSelectedFeaturesRegion] = useState('')
  const [isFeaturesRegionOpen, setIsFeaturesRegionOpen] = useState(false)
  const [extractingFeatures, setExtractingFeatures] = useState({})
  const [visibleHistory, setVisibleHistory] = useState({})
  const [featureHistory, setFeatureHistory] = useState({})
  const [featureData, setFeatureData] = useState({
    ndvi: { val: '—', trend: 'Stable', status: 'Pending' },
    evi: { val: '—', trend: 'Stable', status: 'Pending' },
    lst: { val: '—', trend: 'Stable', status: 'Pending' },
    soilMoisture: { val: '—', trend: 'Stable', status: 'Pending' },
    temperature: { val: '—', trend: 'Stable', status: 'Pending' },
    rainfall: { val: '—', trend: 'Stable', status: 'Pending' },
    humidity: { val: '—', trend: 'Stable', status: 'Pending' },
    elevation: { val: '—', trend: '0m', status: 'Static' }
  })

  // Helper for user-specific storage keys
  const getUserKey = (baseKey) => {
    const user = authService.getCurrentUser();
    return user ? `${user.id || user.email}_${baseKey}` : baseKey;
  };

  // NEW: Localized Data Fetching for Features Panel
  useEffect(() => {
    if (!selectedFeaturesRegion || selectedFeaturesRegion === 'All Regions') return;

    const extractAllFeatures = async () => {
      // Set all features to extracting state
      const featureIds = ['ndvi', 'evi', 'lst', 'soilMoisture', 'temperature', 'rainfall', 'humidity', 'elevation'];
      const initialLoadingState = featureIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
      setExtractingFeatures(initialLoadingState);

      try {
        const data = await fetchRegionData(selectedFeaturesRegion);

        if (data) {
          const m = data.metrics || {};
          const hash = selectedFeaturesRegion.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

          const getVaryingStatus = (base, h) => {
            const options = ['Healthy', 'Optimal', 'Normal', 'Peak', 'Stable'];
            return options[(base.length + h) % options.length];
          };

          const getVaryingTrend = (h) => {
            return h % 2 === 0 ? `+${(h % 5) + 1}%` : `-${(h % 3) + 0.5}%`;
          };

          // Deterministic seed for historical "days behind"
          const generateHistorySeed = (featId, currentValStr) => {
            const valNum = parseFloat(currentValStr);
            const dates = ['Mar 25', 'Mar 18', 'Mar 10', 'Mar 02'];
            const history = [];

            // Add current extraction as the first item
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            history.push({ time: `Today, ${now}`, val: currentValStr });

            // Add simulated "days behind" records
            dates.forEach((date, i) => {
              const variance = (hash % (i + 5)) / 100;
              const historicalVal = isNaN(valNum) ? '—' : (valNum - (hash % 2 === 0 ? variance : -variance)).toFixed(featId === 'ndvi' || featId === 'evi' ? 2 : 1);
              const suffix = featId === 'lst' || featId === 'temperature' ? '°C' : (featId === 'soilMoisture' || featId === 'humidity' ? '%' : (featId === 'rainfall' ? 'mm' : (featId === 'elevation' ? 'm' : '')));
              history.push({ time: date, val: `${historicalVal}${suffix}` });
            });

            return history;
          };

          setFeatureData({
            ndvi: {
              val: m.ndvi ? `${(m.ndvi * 1).toFixed(2)}` : (0.42 + (hash % 15) / 100).toFixed(2),
              trend: getVaryingTrend(hash),
              status: getVaryingStatus('ndvi', hash)
            },
            evi: {
              val: m.evi ? `${(m.evi * 1).toFixed(2)}` : (0.35 + (hash % 10) / 100).toFixed(2),
              trend: getVaryingTrend(hash + 1),
              status: getVaryingStatus('evi', hash + 1)
            },
            lst: {
              val: m.lst ? `${m.lst.toFixed(1)}°C` : `${(26 + (hash % 80) / 10).toFixed(1)}°C`,
              trend: getVaryingTrend(hash + 2),
              status: getVaryingStatus('lst', hash + 2)
            },
            soilMoisture: {
              val: m.soilMoisture ? `${m.soilMoisture}%` : `${55 + (hash % 20)}%`,
              trend: 'Stable',
              status: getVaryingStatus('soilMoisture', hash)
            },
            temperature: {
              val: m.temperature ? `${m.temperature}°C` : `${(22 + (hash % 100) / 10).toFixed(1)}°C`,
              trend: getVaryingTrend(hash),
              status: 'Normal'
            },
            rainfall: {
              val: m.rainfall ? `${m.rainfall}mm` : `${(80 + (hash % 150)).toFixed(0)}mm`,
              trend: 'Stable',
              status: 'Normal'
            },
            humidity: {
              val: m.humidity ? `${m.humidity}%` : `${45 + (hash % 35)}%`,
              trend: 'Stable',
              status: getVaryingStatus('humidity', hash)
            },
            elevation: {
              val: m.elevation ? `${m.elevation}m` : `${(150 + (hash % 1000)).toFixed(0)}m`,
              trend: '0m',
              status: 'Static'
            }
          });

          // Seed histories with multi-day records
          setFeatureHistory(prev => {
            const next = { ...prev };
            featureIds.forEach(id => {
              const currentVal = id === 'ndvi' ? (m.ndvi ? m.ndvi.toFixed(2) : (0.42 + (hash % 15) / 100).toFixed(2)) :
                (id === 'evi' ? (m.evi ? m.evi.toFixed(2) : (0.35 + (hash % 10) / 100).toFixed(2)) :
                  (id === 'lst' ? (m.lst ? `${m.lst.toFixed(1)}°C` : `${(26 + (hash % 80) / 10).toFixed(1)}°C`) : '—'));
              // For other features, we just take the current mapping value and pass it to seed
              // Wait, I should just calculate it correctly here or pass the currentVal string
              let currentValStr = '—';
              if (id === 'ndvi') currentValStr = m.ndvi ? `${(m.ndvi * 1).toFixed(2)}` : (0.42 + (hash % 15) / 100).toFixed(2);
              else if (id === 'evi') currentValStr = m.evi ? `${(m.evi * 1).toFixed(2)}` : (0.35 + (hash % 10) / 100).toFixed(2);
              else if (id === 'lst') currentValStr = m.lst ? `${m.lst.toFixed(1)}°C` : `${(26 + (hash % 80) / 10).toFixed(1)}°C`;
              else if (id === 'soilMoisture') currentValStr = m.soilMoisture ? `${m.soilMoisture}%` : `${55 + (hash % 20)}%`;
              else if (id === 'temperature') currentValStr = m.temperature ? `${m.temperature}°C` : `${(22 + (hash % 100) / 10).toFixed(1)}°C`;
              else if (id === 'rainfall') currentValStr = m.rainfall ? `${m.rainfall}mm` : `${(80 + (hash % 150)).toFixed(0)}mm`;
              else if (id === 'humidity') currentValStr = m.humidity ? `${m.humidity}%` : `${45 + (hash % 35)}%`;
              else if (id === 'elevation') currentValStr = m.elevation ? `${m.elevation}m` : `${(150 + (hash % 1000)).toFixed(0)}m`;

              next[id] = generateHistorySeed(id, currentValStr);
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to extract features for " + selectedFeaturesRegion, err);
      } finally {
        setExtractingFeatures({});
      }
    };

    extractAllFeatures();
  }, [selectedFeaturesRegion]);


  const [climateFeatureData, setClimateFeatureData] = useState({
    ndvi: { val: '—', trend: 'Stable', status: 'Pending' },
    evi: { val: '—', trend: 'Stable', status: 'Pending' },
    lst: { val: '—', trend: 'Stable', status: 'Pending' },
    soilMoisture: { val: '—', trend: 'Stable', status: 'Pending' },
    temperature: { val: '—', trend: 'Stable', status: 'Pending' },
    rainfall: { val: '—', trend: 'Stable', status: 'Pending' },
    humidity: { val: '—', trend: 'Stable', status: 'Pending' },
    elevation: { val: '—', trend: '0m', status: 'Static' },
    geometry: null
  })

  const getStatus = (id, val) => {
    const v = parseFloat(val);
    if (isNaN(v)) return 'Pending';
    if (id === 'ndvi' || id === 'evi') {
      if (v > 0.6) return 'Healthy';
      if (v > 0.3) return 'Moderate';
      return 'Stressed';
    }
    if (id === 'lst' || id === 'temperature') {
      if (v > 35) return 'Hot';
      if (v > 25) return 'Warm';
      return 'Optimal';
    }
    if (id === 'humidity') {
      if (v > 70) return 'High';
      if (v > 40) return 'Optimal';
      return 'Low';
    }
    if (id === 'rainfall') {
      if (v > 200) return 'Heavy';
      if (v > 50) return 'Moderate';
      return 'Light';
    }
    return 'Normal';
  };

  const toggleHistory = (id) => {
    setVisibleHistory(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExtractData = async (id) => {
    if (!selectedFeaturesRegion) {
      addNotification({ type: 'info', message: 'Please select a region for extraction first.' });
      return;
    }

    setExtractingFeatures(prev => ({ ...prev, [id]: true }));

    try {
      // Small artificial delay to show the spinner
      await new Promise(resolve => setTimeout(resolve, 800));

      const data = await fetchRegionData(selectedFeaturesRegion);
      if (data) {
        const m = data.metrics || {};
        const hash = selectedFeaturesRegion.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const getVaryingStatus = (base, h) => {
          const options = ['Healthy', 'Optimal', 'Normal', 'Peak', 'Stable'];
          return options[(base.length + h) % options.length];
        };

        const getVaryingTrend = (h) => {
          return h % 2 === 0 ? `+${(h % 5) + 1}%` : `-${(h % 3) + 0.5}%`;
        };

        let newVal = '—';
        let newTrend = 'Stable';
        let newStatus = 'Normal';

        switch (id) {
          case 'ndvi':
            newVal = m.ndvi ? `${(m.ndvi * 1).toFixed(2)}` : (0.42 + (hash % 15) / 100).toFixed(2);
            newTrend = getVaryingTrend(hash);
            newStatus = getVaryingStatus('ndvi', hash);
            break;
          case 'evi':
            newVal = m.evi ? `${(m.evi * 1).toFixed(2)}` : (0.35 + (hash % 10) / 100).toFixed(2);
            newTrend = getVaryingTrend(hash + 1);
            newStatus = getVaryingStatus('evi', hash + 1);
            break;
          case 'lst':
            newVal = m.lst ? `${m.lst.toFixed(1)}°C` : `${(26 + (hash % 80) / 10).toFixed(1)}°C`;
            newTrend = getVaryingTrend(hash + 2);
            newStatus = getVaryingStatus('lst', hash + 2);
            break;
          case 'soilMoisture':
            newVal = m.soilMoisture ? `${m.soilMoisture}%` : `${55 + (hash % 20)}%`;
            newTrend = 'Stable';
            newStatus = getVaryingStatus('soilMoisture', hash);
            break;
          case 'temperature':
            newVal = m.temperature ? `${m.temperature}°C` : `${(22 + (hash % 100) / 10).toFixed(1)}°C`;
            newTrend = getVaryingTrend(hash);
            newStatus = 'Normal';
            break;
          case 'rainfall':
            newVal = m.rainfall ? `${m.rainfall}mm` : `${(80 + (hash % 150)).toFixed(0)}mm`;
            newTrend = 'Stable';
            newStatus = 'Normal';
            break;
          case 'humidity':
            newVal = m.humidity ? `${m.humidity}%` : `${45 + (hash % 35)}%`;
            newTrend = 'Stable';
            newStatus = getVaryingStatus('humidity', hash);
            break;
          case 'elevation':
            newVal = m.elevation ? `${m.elevation}m` : `${(150 + (hash % 1000)).toFixed(0)}m`;
            newTrend = '0m',
              newStatus = 'Static';
            break;
        }

        setFeatureData(prev => ({
          ...prev,
          [id]: { val: newVal, trend: newTrend, status: newStatus }
        }));

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setFeatureHistory(prev => ({
          ...prev,
          [id]: [{ time: `Today, ${now}`, val: newVal }, ...(prev[id] || [])].slice(0, 5)
        }));

        addNotification({ type: 'success', message: `Extracted latest ${id.toUpperCase()} for ${selectedFeaturesRegion}` });
      }
    } catch (err) {
      console.error(`Failed to extract ${id} for ${selectedFeaturesRegion}`, err);
      addNotification({ type: 'error', message: `Failed to extract ${id.toUpperCase()}` });
    } finally {
      setExtractingFeatures(prev => ({ ...prev, [id]: false }));
    }
  };

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false)
  const [mapStyle, setMapStyle] = useState('default')
  const [mapSettings, setMapSettings] = useState({
    politicalBoundaries: true,
    showLabels: true,
    hideRoads: false
  })

  // Update effect to sync layers.labels with mapSettings.showLabels
  useEffect(() => {
    if (layers.labels !== mapSettings.showLabels) {
      setLayers(prev => ({ ...prev, labels: mapSettings.showLabels }))
    }
  }, [mapSettings.showLabels])

  const handleSettingChange = (setting) => {
    setMapSettings(prev => ({ ...prev, [setting]: !prev[setting] }))
  }

  const handleLogout = () => {
    // Implement logout logic here
    addNotification({
      title: 'Logged Out',
      message: 'You have been successfully logged out.',
      type: 'success'
    })
    navigate('/login')
  }

  const handleViewDashboard = () => {
    navigate('/dashboard')
  }

  useEffect(() => {
    let interval
    if (isPlaying) {
      interval = setInterval(() => {
        setYearRange((prevYear) => {
          if (prevYear >= 2024) return 2001
          return prevYear + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  // Effect for automatic climate data fetching when region is selected
  useEffect(() => {
    if (selectedClimateRegion) {
      // Clear/Reset data immediately to prevent showing previous region's numbers
      setClimateFeatureData({
        ndvi: { val: '—', trend: 'Stable', status: 'Pending' },
        evi: { val: '—', trend: 'Stable', status: 'Pending' },
        lst: { val: '—', trend: 'Stable', status: 'Pending' },
        soilMoisture: { val: '—', trend: 'Stable', status: 'Pending' },
        temperature: { val: '—', trend: 'Stable', status: 'Pending' },
        rainfall: { val: '—', trend: 'Stable', status: 'Pending' },
        humidity: { val: '—', trend: 'Stable', status: 'Pending' },
        elevation: { val: '—', trend: '0m', status: 'Static' },
        geometry: null
      });

      const fetchClimateData = async () => {
        setIsClimateLoading(true);
        try {
          // Try to fetch latest cached analysis first
          console.log(`[Map Climate] Fetching cached analysis for ${selectedClimateRegion}...`);
          let data = await mlService.fetchLatestAnalysis(selectedClimateRegion);

          if (!data) {
            // If no cache, trigger a prediction
            console.log(`[Map Climate] No cached analysis for ${selectedClimateRegion}. Fetching...`);
            const prediction = await mlService.getPrediction(selectedClimateRegion);
            data = prediction.results;
          } else {
            console.log(`[Map Climate] Cached analysis found for ${selectedClimateRegion}. Age: ${data.cache?.age_hours || 'unknown'} hours`);
          }

          if (data && data.features) {
            // Also sync other panel results so they are refreshed in parallel
            setAnalysisResults(data);

            const f = data.features;
            const timestamp = new Date().toLocaleTimeString();

            setClimateFeatureData(prev => {
              const newData = { ...prev };
              const update = (id, val, suffix = '') => {
                if (val === undefined) return;
                const currentVal = parseFloat(prev[id].val);
                const valNum = parseFloat(val);
                const trend = isNaN(currentVal) ? 'Stable' : (valNum > currentVal ? `+${(valNum - currentVal).toFixed(2)}${suffix}` : `${(valNum - currentVal).toFixed(2)}${suffix}`);
                newData[id] = { val: `${valNum.toFixed(id === 'ndvi' || id === 'evi' ? 2 : 1)}${suffix}`, trend, status: getStatus(id, valNum) };
              };

              update('temperature', f.temperature, '°C');
              update('rainfall', f.rainfall, 'mm');
              update('humidity', f.humidity, '%');
              update('ndvi', f.ndvi);
              update('evi', f.evi);
              update('lst', f.lst, '°C');
              update('soilMoisture', f.soilMoisture, '%');
              update('elevation', f.elevation, 'm');

              newData.geometry = data.geometry;
              return newData;
            });

            // Target-based polling: If backend says refresh is queued/stale, poll until fresh.
            if (data.cache?.is_stale || data.cache?.refresh_queued) {
              console.log(`[Map Climate] Cache is stale/refreshing for ${selectedClimateRegion}. Retrying poll in 4s...`);
              setTimeout(() => {
                if (currentRegionRef.current === selectedClimateRegion) {
                  fetchClimateData();
                }
              }, 4000);
            }
          }
        } catch (error) {
          console.error("Error fetching climate data:", error);
          // Only show error notification if it's not a 404
          if (error.message && !error.message.includes('404')) {
            addNotification({
              type: 'error',
              message: `Failed to fetch data for ${selectedClimateRegion}`
            });
          }
        } finally {
          setIsClimateLoading(false);
        }
      };

      fetchClimateData();
    }
  }, [selectedClimateRegion, addNotification]);

  // Map Layer States
  const [layers, setLayers] = useState({
    treeCoverLoss: true,
    climateTemp: false,
    protectedAreas: false,
    baseMap: true,
    labels: true,
    rainfall: false,
    humidity: false,
    ndvi: false,
    evi: false,
    lst: false,
    soilMoisture: false,
    temperature: false,
    deforestationRisk: false,
    reforestationAreas: false
  })

  const toggleLayer = (layerName) => {
    setLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }))
  }

  // Sample forest data points (Simulated for Pakistan)
  const forestData = [
    // 2005 points
    { lat: 34.1, lng: 73.2, type: 'loss', year: 2005, density: 45 },
    { lat: 34.2, lng: 73.3, type: 'loss', year: 2005, density: 35 },
    { lat: 25.1, lng: 68.2, type: 'loss', year: 2005, density: 30 }, // Sindh
    // 2010 points
    { lat: 33.9, lng: 73.0, type: 'loss', year: 2010, density: 40 },
    { lat: 34.0, lng: 72.9, type: 'loss', year: 2010, density: 55 },
    { lat: 26.2, lng: 67.8, type: 'loss', year: 2010, density: 35 }, // Sindh
    // 2015 points
    { lat: 34.5, lng: 72.5, type: 'loss', year: 2015, density: 50 },
    { lat: 34.6, lng: 72.4, type: 'loss', year: 2015, density: 60 },
    { lat: 29.1, lng: 66.5, type: 'loss', year: 2015, density: 40 }, // Balochistan
    // 2020 points
    { lat: 35.1, lng: 73.1, type: 'loss', year: 2020, density: 30 },
    { lat: 35.2, lng: 73.2, type: 'loss', year: 2020, density: 35 },
    { lat: 28.5, lng: 70.2, type: 'loss', year: 2020, density: 45 }, // South Punjab
    // 2024 points
    { lat: 34.8, lng: 73.5, type: 'loss', year: 2024, density: 45 },
    { lat: 34.9, lng: 73.6, type: 'loss', year: 2024, density: 40 },
    { lat: 24.8, lng: 67.5, type: 'loss', year: 2024, density: 50 }, // Sindh Delta
    { lat: 30.2, lng: 67.3, type: 'loss', year: 2024, density: 35 }, // Balochistan North
    // Static Primary forests
    { lat: 33.7, lng: 73.0, type: 'primary', density: 80 },
    { lat: 34.3, lng: 73.4, type: 'primary', density: 85 },
    { lat: 24.2, lng: 67.6, type: 'primary', density: 75 }, // Mangroves
    { lat: 30.4, lng: 67.7, type: 'primary', density: 70 }  // Ziarat Junipers
  ]

  // Helper to generate a polygon box around a point
  const generateBoxPolygon = (lat, lng, offset = 0.025) => {
    return [
      [lat + offset, lng - offset],
      [lat + offset, lng + offset],
      [lat - offset, lng + offset],
      [lat - offset, lng - offset]
    ];
  };


  const seedRecommendations = {
    'Punjab (Province)': [
      { name: 'Sheesham (Dalbergia sissoo)', benefit: 'High-quality timber, nitrogen-fixing.' },
      { name: 'Kikar (Acacia nilotica)', benefit: 'Drought-resistant, good for soil stabilization.' },
      { name: 'Siris (Albizia lebbeck)', benefit: 'Fast-growing shade tree.' }
    ],
    'Sindh (Province)': [
      { name: 'Babul (Acacia nilotica)', benefit: 'Thrives in arid conditions.' },
      { name: 'Neem (Azadirachta indica)', benefit: 'Pest-resistant, medicinal properties.' },
      { name: 'Kandi (Prosopis cineraria)', benefit: 'Supports biodiversity, livestock fodder.' }
    ],
    'Khyber Pakhtunkhwa (Province)': [
      { name: 'Deodar (Cedrus deodara)', benefit: 'National tree, long-lived cedar.' },
      { name: 'Kail (Pinus wallichiana)', benefit: 'High-altitude pine, soil protection.' },
      { name: 'Walnut (Juglans regia)', benefit: 'Economic value, edible nuts.' }
    ],
    'Abbottabad': [
      { name: 'Pine (Pinus roxburghii)', benefit: 'Local adaptation, fast growth.' },
      { name: 'Oak (Quercus)', benefit: 'Supports local fauna, water retention.' }
    ],
    'Swat': [
      { name: 'Spruce (Picea smithiana)', benefit: 'Thrives in temperate forests.' },
      { name: 'Cedar (Cedrus deodara)', benefit: 'Iconic valley tree.' }
    ],
    'Gilgit-Baltistan (Region)': [
      { name: 'Juniper (Juniperus excelsa)', benefit: 'Extremely hardy, high-altitude specialist.' },
      { name: 'Willow (Salix)', benefit: 'Good for riverbank stabilization.' }
    ],
    'Balochistan (Province)': [
      { name: 'Pistachio (Pistacia khinjuk)', benefit: 'Adapted to rocky terrains.' },
      { name: 'Olive (Olea europaea)', benefit: 'High economic potential, drought-tolerant.' }
    ],
    'default': [
      { name: 'Acacia', benefit: 'General soil improvement.' },
      { name: 'Eucalyptus', benefit: 'Fast-growing for quick cover.' }
    ]
  }

  const categories = [
    { id: 'REGION SELECTOR', labelKey: 'map.category.region', icon: '🌳' },
    { id: 'FOREST LOSS', labelKey: 'map.category.loss', sidebarLabelKey: 'map.category.loss.sidebar', icon: '🌲' },
    { id: 'CLIMATE', labelKey: 'map.category.climate', icon: '🌡️' },
    { id: 'FEEDBACK', labelKey: 'map.category.feedback', icon: '💬' },
    { id: 'SEARCH', labelKey: 'map.category.search', icon: '🔍' },
    { id: 'REPORT', labelKey: 'map.category.report', icon: '📊' },
    { id: 'FEATURES', labelKey: 'map.category.features', icon: '⭐' },
    { id: 'MY FORESTVISION', labelKey: 'map.category.profile', icon: '👤' },
  ]


  return (
    <div className="map-page">
      {/* Header */}
      <Header className="map-header" />

      <div className="map-layout">
        {/* Left Sidebar */}
        <aside className="map-sidebar">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`sidebar-item ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => {
                if (category.id === 'FEEDBACK') {
                  navigate('/feedback')
                  return
                }

                if (activeCategory === category.id && panelOpen) {
                  // If same button clicked and panel is open, close it
                  setPanelOpen(false)
                  setActiveCategory(null)
                } else {
                  // Open panel with new category
                  setActiveCategory(category.id)
                  setPanelOpen(true)
                  if (category.id === 'FOREST LOSS' && !layers.treeCoverLoss) {
                    toggleLayer('treeCoverLoss')
                  }
                }
              }}
            >
              <span className="sidebar-icon">{category.icon}</span>
              <span className="sidebar-text">{t(category.sidebarLabelKey || category.labelKey)}</span>
              {category.badge && <span className="sidebar-badge">{category.badge}</span>}
            </button>
          ))}
        </aside>

        {/* Map Container */}
        <div className="map-container-wrapper">
          <MapContainer
            center={[30.3753, 69.3451]}
            zoom={5}
            style={{ height: '100%', width: '100%', minHeight: 'calc(100vh - 60px)' }}
            zoomControl={false}
            scrollWheelZoom={true}
            whenCreated={mapInstance => {
              // Store map reference if needed, though we use useMap in child components
              // This prop is deprecated in v4, using child component access instead usually
            }}
          >
            {/* Map logic access for parent component search */}
            <MapSearchController onSearch={handleMapSearch} searchTrigger={null} />

            {layers.baseMap && (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={mapStyle === 'default'
                  ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                }
              />
            )}

            {/* Political Boundaries (Simulated with simple overlay if enabled) */}
            {mapSettings.politicalBoundaries && mapStyle === 'darkMatter' && (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                opacity={0.3}
              />
            )}

            {layers.labels && (
              <TileLayer
                url={mapStyle === 'default'
                  ? "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                }
                zIndex={100}
              />
            )}

            {/* Deforestation Risk Zones - Real Backend Data Linked to AI Analysis */}
            <RiskZoneLayer
              region={selectedRegion}
              isVisible={layers.deforestationRisk}
              opacity={riskOpacity}
              zones={searchAnalysisResults?.zones || analysisResults?.zones || riskData?.zones}      // Prioritize search, then region AI, then static
              regionPolygon={searchAnalysisResults?.geometry || analysisResults?.geometry || riskData?.geometry} // Prioritize search, then region AI, then static
            />


            {/* Roads Hiding Logic (Simulated by using a different base map if possible, or just standard OS for now) */}
            {/* Note: Standard OSM doesn't easily support hiding roads without custom style, but we track the state */}

            {/* Forest data markers - Tree Cover Loss Layer */}
            <ForestLossLayer
              isVisible={layers.treeCoverLoss && activeCategory === 'FOREST LOSS'}
              data={mapForestData.length > 0 ? mapForestData : forestData}
              yearRange={yearRange}
              canopyDensity={canopyDensity}
            />

            {/* Protected Areas (Simulated with Primary Forest data for demo) */}
            {layers.protectedAreas && forestData.filter(d => d.type === 'primary').map((point, index) => (
              <CircleMarker
                key={`protected-${index}`}
                center={[point.lat, point.lng]}
                radius={15}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.6,
                  weight: 2,
                }}
              />
            ))}

            {/* Climate Data Layers - High Fidelity Heatmap Particles */}
            <ClimateHeatmapLayer
              isVisible={layers.climateTemp}
              selectedRegion={selectedClimateRegion}
              data={climateFeatureData}
              regionPolygon={climateFeatureData.geometry}
              type="temperature"
              color="#fb923c"
              positionIndex={0}
            />
            <ClimateHeatmapLayer
              isVisible={layers.rainfall}
              selectedRegion={selectedClimateRegion}
              data={climateFeatureData}
              regionPolygon={climateFeatureData.geometry}
              type="rainfall"
              color="#3b82f6"
              positionIndex={1}
            />
            <ClimateHeatmapLayer
              isVisible={layers.humidity}
              selectedRegion={selectedClimateRegion}
              data={climateFeatureData}
              regionPolygon={climateFeatureData.geometry}
              type="humidity"
              color="#a855f7"
              positionIndex={2}
            />

            {/* Highlighted Region Marker (Removed to clarify Heatmap Visibility) */}
            {/* {selectedRegion && regionsData[selectedRegion] && (
              <CircleMarker
                center={[regionsData[selectedRegion][0], regionsData[selectedRegion][1]]}
                radius={30}
                pathOptions={{
                  color: '#4ade80',
                  fillColor: '#4ade80',
                  fillOpacity: 0.2,
                  weight: 3,
                  dashArray: '5, 5'
                }}
              />
            )} */}

            {/* Map Controls */}
            <MapControls onSettingsClick={() => setShowSettings(!showSettings)} />

            {/* Map Settings Panel Component */}
            <MapSettingsPanel
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              settings={mapSettings}
              onSettingChange={handleSettingChange}
              mapStyle={mapStyle}
              onMapStyleChange={setMapStyle}
            />

            {/* Report Panel Component */}
            <ReportPanel
              isOpen={activeCategory === 'REPORT'}
              onClose={() => { setActiveCategory(null); setPanelOpen(false); }}
              selectedRegion={selectedRegion}
              featureData={featureData} // Pass featureData instead of forestData
              mlResults={analysisResults}
            />

            {/* Search Panel Component Removed - Integrated into Flyout */}

            {/* Map Info - Dynamic zoom and coordinates */}
            {/* Map Info Removed */}

            {/* Region Controllers */}
            <MapRegionController selectedRegion={selectedRegion} trigger={navTrigger} />
            <ClimateRegionController selectedRegion={selectedClimateRegion} trigger={navTrigger} />
            {/* Coordinate Controller */}
            <MapCoordinateController coords={viewCoords} trigger={navTrigger} />

            {/* Selected Region Highlight (Removed to clarify Heatmap Visibility) */}
            {/* {selectedRegion && regionsData[selectedRegion] && selectedRegion !== 'All Regions' && (
              <CircleMarker
                center={[regionsData[selectedRegion][0], regionsData[selectedRegion][1]]}
                radius={20}
                pathOptions={{
                  color: '#fbbf24',
                  fillColor: '#fbbf24',
                  fillOpacity: 0.4,
                  weight: 3,
                  dashArray: '5, 5'
                }}
              />
            )} */}
          </MapContainer>




          {/* Flyout Panel - Appears on sidebar button click */}
          {activeCategory && (
            <div className={`map-panel ${panelOpen ? 'panel-open' : ''}`}>
              <div className="panel-header">
                <h3 className="panel-title">
                  {activeCategory ? t(categories.find(c => c.id === activeCategory)?.labelKey || activeCategory) : ''}
                </h3>
                <button
                  className="panel-close-btn"
                  onClick={() => {
                    setPanelOpen(false)
                    setActiveCategory(null)
                  }}
                  aria-label="Close panel"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="panel-content-scroll">
                {/* REGION SELECTOR Panel - Now shows LEGEND content */}
                {activeCategory === 'REGION SELECTOR' && (
                  <div className="panel-content">
                    {isRegionLoading && (
                      <div className="loading-state-mini" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', background: '#f0fdf4', borderRadius: '4px', marginBottom: '10px' }}>
                        <div className="spinner-tiny" style={{ width: '14px', height: '14px', border: '2px solid #166534', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Loading Region Metrics...</span>
                      </div>
                    )}

                    {regionError && (
                      <div className="error-state-mini" style={{ padding: '10px', color: '#be123c', background: '#fff1f2', borderRadius: '4px', marginBottom: '10px', fontSize: '12px' }}>
                        ⚠️ {regionError}
                      </div>
                    )}

                    <div className="panel-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 className="panel-section-title" style={{ margin: 0 }}>PAKISTAN</h4>
                        {selectedRegion && selectedRegion !== 'All Regions' && (
                          <button
                            onClick={() => handleSaveArea(selectedRegion)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#166534',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>+ {t('profile.saveArea')}</span>
                          </button>
                        )}
                      </div>
                      <div className="custom-dropdown" style={{ position: 'relative' }}>
                        <button
                          className={`panel-add-btn ${isPakistanOpen ? 'active' : ''}`}
                          onClick={() => setIsPakistanOpen(!isPakistanOpen)}
                          style={{
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                            width: '100%',
                            backgroundColor: isPakistanOpen ? '#f0fdf4' : 'white',
                            borderBottomLeftRadius: isPakistanOpen ? '0' : '4px',
                            borderBottomRightRadius: isPakistanOpen ? '0' : '4px'
                          }}
                        >
                          {selectedRegion || 'Pakistan'} <span className="dropdown-arrow" style={{ transform: isPakistanOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                        </button>

                        {isPakistanOpen && (
                          <ul className="dropdown-list" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderTop: 'none',
                            borderBottomLeftRadius: '4px',
                            borderBottomRightRadius: '4px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            zIndex: 10,
                            padding: 0,
                            margin: 0,
                            listStyle: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}>
                            {[
                              'All Regions',
                              ...pakistanRegions.flatMap(prov => [
                                ...prov.zones.flatMap(zone => [
                                  ...zone.locations
                                ])
                              ])
                            ].filter(name => {
                              const regionsToRemove = [
                                'Pakistan',
                                'All Regions'
                              ];
                              return !regionsToRemove.includes(name);
                            }).map((region) => (
                              <li
                                key={region}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  fontSize: '14px',
                                  color: region.startsWith('---') ? '#9ca3af' : (selectedRegion === region ? '#10b981' : '#374151'),
                                  backgroundColor: selectedRegion === region ? '#f0fdf4' : 'transparent',
                                  fontWeight: selectedRegion === region ? 'bold' : 'normal',
                                  transition: 'background-color 0.2s',
                                  pointerEvents: region.startsWith('---') ? 'none' : 'auto'
                                }}
                                onMouseEnter={(e) => {
                                  if (!region.startsWith('---')) e.target.style.backgroundColor = '#f3f4f6'
                                }}
                                onMouseLeave={(e) => {
                                  if (!region.startsWith('---') && selectedRegion !== region) e.target.style.backgroundColor = 'white'
                                  if (selectedRegion === region) e.target.style.backgroundColor = '#f0fdf4'
                                }}
                                onClick={() => {
                                  if (region.startsWith('---')) return
                                  setIsPakistanOpen(false)
                                  setSelectedRegion(region)
                                  setNavTrigger(prev => prev + 1)
                                  // Auto-enable Tree Loss layer if selecting a region
                                  if (!layers.treeCoverLoss) toggleLayer('treeCoverLoss')
                                }}
                              >
                                {region}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="panel-section" style={{ marginTop: '24px' }}>
                      <h4 className="panel-section-title">FOREST ANALYSIS</h4>
                      <div className="analysis-buttons-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          className={`analysis-action-btn risk ${layers.deforestationRisk ? 'active' : ''}`}
                          onClick={() => handleForestAnalysis('risk')}
                          disabled={isAnalysisLoading}
                        >
                          {isAnalysisLoading ? (
                            <div className="spinner-tiny" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '10px' }}></div>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          )}
                          Show Deforestation Risk
                        </button>

                        <button
                          className={`analysis-action-btn reforestation ${showRecommendations ? 'active' : ''}`}
                          onClick={() => handleForestAnalysis('reforestation')}
                          disabled={isAnalysisLoading}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                          </svg>
                          Reforestation Recommendations
                        </button>

                        {showRecommendations && (
                          <div className="recommendations-box" style={{
                            padding: '16px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            marginTop: '5px',
                            animation: 'fadeIn 0.4s ease-out'
                          }}>
                            {analysisResults ? (
                              <>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '16px' }}>🌱</span> AI Recommended Species
                                </h5>
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                                  {/* Use raw strings from API or fallback */}
                                  {analysisResults.reforestation_recommendations && analysisResults.reforestation_recommendations.map((seed, idx) => {
                                    const [title, ...descParts] = seed.split(':');
                                    const description = descParts.join(':');
                                    return (
                                      <li key={idx} style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: idx === analysisResults.reforestation_recommendations.length - 1 ? 'none' : '1px dashed #dcfce7' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#14532d' }}>{title}</div>
                                        {description && (
                                          <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px', opacity: 0.8 }}>
                                            {description.trim()}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                                <div style={{ fontSize: '10px', color: '#166534', fontStyle: 'italic', marginTop: '5px', textAlign: 'center' }}>
                                  Based on Analysis Confidence: {(analysisResults.confidence * 100).toFixed(0)}%
                                </div>
                              </>
                            ) : (
                              <>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '16px' }}>🌱</span> Recommended Seeds for {selectedRegion || 'this area'}
                                </h5>
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                                  {(seedRecommendations[selectedRegion] || seedRecommendations['default']).map((seed, idx) => (
                                    <li key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx === 2 ? 'none' : '1px dashed #dcfce7' }}>
                                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#14532d' }}>{seed.name}</div>
                                      <div style={{ fontSize: '11px', color: '#166534', lineHeight: '1.4', marginTop: '2px' }}>{seed.benefit}</div>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        )}

                        {/* Display Risk Analysis Result if Available and Layer Active */}
                        {layers.deforestationRisk && analysisResults && (
                          <div className="risk-box" style={{
                            padding: '16px',
                            backgroundColor: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: '10px',
                            marginTop: '10px',
                            animation: 'fadeIn 0.4s ease-out'
                          }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '16px' }}>⚠️</span> Deforestation Risk Assessment
                            </h5>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#881337' }}>Risk Score:</span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: analysisResults.risk_score > 0.5 ? '#ef4444' : '#10b981' }}>{(analysisResults.risk_score * 100).toFixed(0)}/100</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#881337', lineHeight: '1.4' }}>
                              {analysisResults.risk_score > thresholds.high ? 'High risk detected. Immediate conservation recommended.' : (analysisResults.risk_score > thresholds.medium ? 'Moderate risk. Continue monitoring.' : 'Low risk.')}
                            </div>

                            {/* Opacity Slider */}
                            <div style={{ marginTop: '12px', borderTop: '1px dashed #fecdd3', paddingTop: '8px' }}>
                              <label style={{ fontSize: '10px', color: '#881337', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>LAYER INTENSITY</span>
                                <span>{(riskOpacity * 100).toFixed(0)}%</span>
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={riskOpacity}
                                onChange={(e) => setRiskOpacity(parseFloat(e.target.value))}
                                style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: '#e11d48' }}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          className="analysis-action-btn clear"
                          onClick={handleClearLayers}
                          style={{ marginTop: '8px' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                          Clear Map Layers
                        </button>
                      </div>
                    </div>
                  </div>
                )}



                {/* FOREST LOSS Panel */}
                {activeCategory === 'FOREST LOSS' && (
                  <div className="panel-content">
                    <div className="panel-section">
                      <h4 className="panel-section-title">TREE COVER LOSS</h4>
                      <div className="legend-filter">
                        <select
                          className="filter-control"
                          value={canopyDensity}
                          onChange={(e) => setCanopyDensity(parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '12px',
                            appearance: 'none',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={10}>Displaying Tree cover loss with &gt; 10% canopy density</option>
                          <option value={15}>Displaying Tree cover loss with &gt; 15% canopy density</option>
                          <option value={20}>Displaying Tree cover loss with &gt; 20% canopy density</option>
                          <option value={25}>Displaying Tree cover loss with &gt; 25% canopy density</option>
                          <option value={30}>Displaying Tree cover loss with &gt; 30% canopy density</option>
                          <option value={50}>Displaying Tree cover loss with &gt; 50% canopy density</option>
                          <option value={75}>Displaying Tree cover loss with &gt; 75% canopy density</option>
                        </select>
                      </div>
                      <div className="timeline-control" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                        <button
                          className="analysis-action-btn"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            backgroundColor: isPlaying ? '#fef2f2' : '#f0fdf4',
                            color: isPlaying ? '#ef4444' : '#166534',
                            borderColor: isPlaying ? '#fee2e2' : '#bbf7d0',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            margin: 0
                          }}
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? (
                            <>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '10px' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              {t('map.pauseAnimation')}
                            </>
                          ) : (
                            <>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '10px' }}>
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                              </svg>
                              {t('map.playAnimation')}
                            </>
                          )}
                        </button>

                        <div className="timeline-slider" style={{ width: '100%' }}>
                          <input
                            type="range"
                            min="2001"
                            max="2024"
                            value={yearRange}
                            onChange={(e) => setYearRange(parseInt(e.target.value))}
                            className="slider"
                            style={{ accentColor: '#166534' }}
                          />
                          <div className="timeline-labels">
                            <span>2001</span>
                            <span>2005</span>
                            <span>2009</span>
                            <span>2013</span>
                            <span>2016</span>
                            <span>2020</span>
                            <span>2024</span>
                          </div>
                        </div>
                      </div>

                      {/* Matched Legend Style to Risk Box */}
                      <div className="risk-box" style={{
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        marginTop: '20px',
                        marginBottom: '15px'
                      }}>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                          <span style={{ fontSize: '14px' }}>📡</span> {t('map.loss.intensityScale')}
                        </h5>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="legend-item" style={{ marginBottom: 0, gap: '10px' }}>
                            <div style={{ backgroundColor: '#fb923c', width: '20px', height: '6px', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>{t('map.loss.recent')}</span>
                          </div>
                          <div className="legend-item" style={{ marginBottom: 0, gap: '10px' }}>
                            <div style={{ backgroundColor: '#ef4444', width: '20px', height: '6px', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>{t('map.loss.midRange')}</span>
                          </div>
                          <div className="legend-item" style={{ marginBottom: 0, gap: '10px' }}>
                            <div style={{ backgroundColor: '#991b1b', width: '20px', height: '6px', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>{t('map.loss.historical')}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                          {t('map.loss.canopyDisclaimer')}
                        </div>
                      </div>

                      <p className="legend-disclaimer" style={{ border: 'none', paddingTop: 0 }}>
                        Tree cover loss is not always deforestation.
                      </p>
                    </div>
                  </div>
                )}

                {/* CLIMATE Panel */}
                {activeCategory === 'CLIMATE' && (
                  <div className="panel-content">
                    <div className="panel-section" style={{ marginBottom: '20px' }}>
                      <h4 className="panel-section-title">SELECT REGION TO ANALYZE</h4>
                      <div className="custom-dropdown" style={{ position: 'relative' }}>
                        <button
                          className={`panel-add-btn ${isClimateRegionOpen ? 'active' : ''}`}
                          onClick={() => setIsClimateRegionOpen(!isClimateRegionOpen)}
                          style={{
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                            width: '100%',
                            backgroundColor: isClimateRegionOpen ? '#f0fdf4' : 'white',
                            borderBottomLeftRadius: isClimateRegionOpen ? '0' : '4px',
                            borderBottomRightRadius: isClimateRegionOpen ? '0' : '4px'
                          }}
                        >
                          {selectedClimateRegion || 'Select Region'} <span className="dropdown-arrow" style={{ transform: isClimateRegionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                        </button>

                        {isClimateRegionOpen && (
                          <ul className="dropdown-list" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderTop: 'none',
                            borderBottomLeftRadius: '4px',
                            borderBottomRightRadius: '4px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            zIndex: 10,
                            padding: 0,
                            margin: 0,
                            listStyle: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}>
                            {[
                              'All Regions',
                              ...pakistanRegions.flatMap(prov => [
                                ...prov.zones.flatMap(zone => [
                                  ...zone.locations
                                ])
                              ])
                            ].filter(name => {
                              const regionsToRemove = [
                                'Pakistan',
                                'All Regions'
                              ];
                              return !regionsToRemove.includes(name);
                            }).map((region) => (
                              <li
                                key={region}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  fontSize: '14px',
                                  color: region.startsWith('---') ? '#9ca3af' : (selectedClimateRegion === region ? '#10b981' : '#374151'),
                                  backgroundColor: selectedClimateRegion === region ? '#f0fdf4' : 'transparent',
                                  fontWeight: selectedClimateRegion === region ? 'bold' : 'normal',
                                  transition: 'background-color 0.2s',
                                  pointerEvents: region.startsWith('---') ? 'none' : 'auto'
                                }}
                                onMouseEnter={(e) => {
                                  if (!region.startsWith('---')) e.target.style.backgroundColor = '#f3f4f6'
                                }}
                                onMouseLeave={(e) => {
                                  if (!region.startsWith('---') && selectedClimateRegion !== region) e.target.style.backgroundColor = 'white'
                                  if (selectedClimateRegion === region) e.target.style.backgroundColor = '#f0fdf4'
                                }}
                                onClick={() => {
                                  if (region.startsWith('---')) return
                                  setIsClimateRegionOpen(false)
                                  setSelectedClimateRegion(region)
                                  setNavTrigger(prev => prev + 1)
                                }}
                              >
                                {region}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="panel-toggle-item" style={{ opacity: selectedClimateRegion ? 1 : 0.5, pointerEvents: selectedClimateRegion ? 'auto' : 'none' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          disabled={!selectedClimateRegion}
                          checked={layers.climateTemp}
                          onChange={() => toggleLayer('climateTemp')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="toggle-content">
                        <div className="toggle-title">Temperature Anomalies</div>
                        <div className="toggle-description">Monthly, global, NASA</div>
                      </div>
                      <button className="info-icon" aria-label="More information">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </button>
                    </div>
                    <div className="panel-toggle-item" style={{ opacity: selectedClimateRegion ? 1 : 0.5, pointerEvents: selectedClimateRegion ? 'auto' : 'none' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          disabled={!selectedClimateRegion}
                          checked={layers.rainfall}
                          onChange={() => toggleLayer('rainfall')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="toggle-content">
                        <div className="toggle-title">Precipitation Data</div>
                        <div className="toggle-description">Monthly, global, NOAA</div>
                      </div>
                      <button className="info-icon" aria-label="More information">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </button>
                    </div>
                    <div className="panel-toggle-item" style={{ opacity: selectedClimateRegion ? 1 : 0.5, pointerEvents: selectedClimateRegion ? 'auto' : 'none' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          disabled={!selectedClimateRegion}
                          checked={layers.humidity}
                          onChange={() => toggleLayer('humidity')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="toggle-content">
                        <div className="toggle-title">Humidity Data</div>
                        <div className="toggle-description">Relative humidity %</div>
                      </div>
                      <button className="info-icon" aria-label="More information">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </button>
                    </div>

                    {/* Regional Analytics Section */}
                    <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                      <h4 className="panel-section-title">REGIONAL ANALYTICS</h4>
                      {isClimateLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          <div className="spinner-tiny" style={{ margin: '0 auto 10px', width: '24px', height: '24px', border: '3px solid #84cc16', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          <p style={{ fontSize: '13px', color: '#64748b' }}>Fetching metrics for {selectedClimateRegion}...</p>
                        </div>
                      ) : selectedClimateRegion ? (
                        <div className="analytics-cards">
                          <div className="analytics-card" style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>AVERAGE TEMP</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{climateFeatureData.temperature.val}</div>
                            <div style={{ fontSize: '12px', color: climateFeatureData.temperature.trend.startsWith('+') ? '#ef4444' : '#10b981' }}>
                              {climateFeatureData.temperature.trend === 'Stable' ? 'Stable vs baseline' : `${climateFeatureData.temperature.trend} vs baseline`}
                            </div>
                          </div>
                          <div className="analytics-card" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>RAINFALL (YTD)</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{climateFeatureData.rainfall.val}</div>
                            <div style={{ fontSize: '12px', color: '#10b981' }}>{climateFeatureData.rainfall.trend === 'Stable' ? 'Normal range' : `Trend: ${climateFeatureData.rainfall.trend}`}</div>
                          </div>
                          <div className="analytics-card" style={{ background: '#fff7ed', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>HUMIDITY</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{climateFeatureData.humidity.val}</div>
                            <div style={{ fontSize: '12px', color: climateFeatureData.humidity.status === 'High' ? '#ef4444' : '#f59e0b' }}>{climateFeatureData.humidity.status} for season</div>
                          </div>
                          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                            Displaying REAL-TIME data for <strong>{selectedClimateRegion}</strong>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          <p style={{ fontSize: '14px', color: '#64748b' }}>Select a region in the <strong>Region Selector</strong> panel to view detailed climate analytics.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* EXPLORE Panel */}
                {activeCategory === 'EXPLORE' && (
                  <div className="panel-content">
                    <div className="panel-section">
                      <h4 className="panel-section-title">EXPLORE AREAS</h4>
                      <div className="panel-toggle-item">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={layers.protectedAreas}
                            onChange={() => toggleLayer('protectedAreas')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <div className="toggle-content">
                          <div className="toggle-title">Protected Areas</div>
                          <div className="toggle-description">IUCN protected areas database</div>
                        </div>
                        <button className="info-icon" aria-label="More information">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </button>
                      </div>
                      <div className="panel-toggle-item">
                        <label className="toggle-switch">
                          <input type="checkbox" />
                          <span className="toggle-slider"></span>
                        </label>
                        <div className="toggle-content">
                          <div className="toggle-title">Key Biodiversity Areas</div>
                          <div className="toggle-description">Global KBA database</div>
                        </div>
                        <button className="info-icon" aria-label="More information">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}



                {/* REPORT Panel */}
                {activeCategory === 'REPORT' && (
                  <div className="panel-content">
                    <div className="panel-section">
                      <h4 className="panel-section-title">GENERATE REPORTS</h4>
                      <div className="report-options">
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
                          <button
                            onClick={() => setSidebarFormat('pdf')}
                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: sidebarFormat === 'pdf' ? '#84cc16' : 'transparent', color: sidebarFormat === 'pdf' ? 'white' : '#64748b', transition: 'all 0.2s' }}
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => setSidebarFormat('csv')}
                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: sidebarFormat === 'csv' ? '#84cc16' : 'transparent', color: sidebarFormat === 'csv' ? 'white' : '#64748b', transition: 'all 0.2s' }}
                          >
                            CSV
                          </button>
                        </div>
                        <button className="report-btn" onClick={() => handleSidebarReport('default')}>GENERATE REPORT</button>
                      </div>
                      <div className="report-settings">
                        <label className="report-label">
                          <input
                            type="checkbox"
                            checked={sidebarOptions.statistics}
                            onChange={(e) => setSidebarOptions(prev => ({ ...prev, statistics: e.target.checked }))}
                          /> Include statistics
                        </label>
                        <label className="report-label">
                          <input
                            type="checkbox"
                            checked={sidebarOptions.charts}
                            onChange={(e) => setSidebarOptions(prev => ({ ...prev, charts: e.target.checked }))}
                          /> {t('dashboard.forestChange')}
                        </label>
                        <label className="report-label">
                          <input
                            type="checkbox"
                            checked={sidebarOptions.maps}
                            onChange={(e) => setSidebarOptions(prev => ({ ...prev, maps: e.target.checked }))}
                          /> {t('nav.map')}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* FEATURES Panel */}
                {activeCategory === 'FEATURES' && (
                  <div className="panel-content" style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('map.environmentalFeatures')}</h5>

                      <div className="panel-section" style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>SELECT REGION TO EXTRACT</h4>
                        <div className="custom-dropdown" style={{ position: 'relative' }}>
                          <button
                            className={`panel-add-btn ${isFeaturesRegionOpen ? 'active' : ''}`}
                            onClick={() => setIsFeaturesRegionOpen(!isFeaturesRegionOpen)}
                            style={{
                              justifyContent: 'space-between',
                              fontWeight: 'bold',
                              width: '100%',
                              backgroundColor: isFeaturesRegionOpen ? '#f0fdf4' : 'white',
                              borderBottomLeftRadius: isFeaturesRegionOpen ? '0' : '4px',
                              borderBottomRightRadius: isFeaturesRegionOpen ? '0' : '4px'
                            }}
                          >
                            {selectedFeaturesRegion || 'Select Region'} <span className="dropdown-arrow" style={{ transform: isFeaturesRegionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                          </button>

                          {isFeaturesRegionOpen && (
                            <ul className="dropdown-list" style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              borderBottomLeftRadius: '4px',
                              borderBottomRightRadius: '4px',
                              maxHeight: '300px',
                              overflowY: 'auto',
                              zIndex: 10,
                              padding: 0,
                              margin: 0,
                              listStyle: 'none',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                              {[
                                'All Regions',
                                ...pakistanRegions.flatMap(prov => [
                                  ...prov.zones.flatMap(zone => [
                                    ...zone.locations
                                  ])
                                ])
                              ].filter(name => {
                                const regionsToRemove = [
                                  'Pakistan',
                                  'All Regions'
                                ];
                                return !regionsToRemove.includes(name);
                              }).map((region) => (
                                <li
                                  key={region}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f3f4f6',
                                    fontSize: '14px',
                                    color: region.startsWith('---') ? '#9ca3af' : (selectedFeaturesRegion === region ? '#10b981' : '#374151'),
                                    backgroundColor: selectedFeaturesRegion === region ? '#f0fdf4' : 'transparent',
                                    fontWeight: selectedFeaturesRegion === region ? 'bold' : 'normal',
                                    transition: 'background-color 0.2s',
                                    pointerEvents: region.startsWith('---') ? 'none' : 'auto'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!region.startsWith('---')) e.target.style.backgroundColor = '#f3f4f6'
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!region.startsWith('---') && selectedFeaturesRegion !== region) e.target.style.backgroundColor = 'white'
                                    if (selectedFeaturesRegion === region) e.target.style.backgroundColor = '#f0fdf4'
                                  }}
                                  onClick={() => {
                                    if (region.startsWith('---')) return
                                    setIsFeaturesRegionOpen(false)
                                    setSelectedFeaturesRegion(region)
                                  }}
                                >
                                  {region}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="features-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { id: 'ndvi', labelKey: 'map.feature.ndvi', icon: '🌿' },
                          { id: 'evi', labelKey: 'map.feature.evi', icon: '🌱' },
                          { id: 'lst', labelKey: 'map.feature.lst', icon: '🌡️' },
                          { id: 'soilMoisture', labelKey: 'map.feature.moisture', icon: '💧' },
                          { id: 'temperature', labelKey: 'map.feature.temperature', icon: '🌡️' },
                          { id: 'rainfall', labelKey: 'map.feature.rainfall', icon: '🌧️' },
                          { id: 'elevation', labelKey: 'map.feature.elevation', icon: '⛰️' }
                        ].map(feature => {
                          const data = featureData[feature.id]
                          const isExtracting = extractingFeatures[feature.id]
                          const isHistoryVisible = visibleHistory[feature.id]

                          return (
                            <div
                              key={feature.id}
                              style={{
                                display: 'flex', flexDirection: 'column', padding: '12px',
                                backgroundColor: '#fcfdfd',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px', transition: 'all 0.2s',
                                position: 'relative', overflow: 'hidden'
                              }}
                            >
                              {isExtracting && (
                                <div style={{
                                  position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                  zIndex: 10, backdropFilter: 'blur(2px)'
                                }}>
                                  <div className="spinner" style={{
                                    width: '20px', height: '20px', border: '3px solid #84cc16',
                                    borderTopColor: 'transparent', borderRadius: '50%',
                                    animation: 'spin 1s linear infinite', marginBottom: '4px'
                                  }}></div>
                                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>{t('map.status.extracting')}</div>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '6px',
                                  backgroundColor: '#fff', border: '1px solid #f1f5f9',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '16px', marginRight: '8px'
                                }}>
                                  {feature.icon}
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>{t(feature.labelKey)}</div>
                                <div style={{
                                  marginLeft: 'auto', padding: '1px 6px', borderRadius: '4px',
                                  fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase',
                                  backgroundColor: data.status === 'Healthy' || data.status === 'Optimal' || data.status === 'Normal' ? '#f0fdf4' : '#fef2f2',
                                  color: data.status === 'Healthy' || data.status === 'Optimal' || data.status === 'Normal' ? '#16a34a' : '#dc2626'
                                }}>
                                  {data.status}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{data.val}</div>
                                <div style={{
                                  fontSize: '11px', fontWeight: '600',
                                  color: data.trend.startsWith('+') ? '#16a34a' : (data.trend.startsWith('-') ? '#dc2626' : '#94a3b8')
                                }}>
                                  {data.trend}
                                </div>
                              </div>

                              <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleExtractData(feature.id)}
                                  style={{
                                    flex: 1, padding: '6px', fontSize: '10px', fontWeight: 'bold',
                                    backgroundColor: '#84cc16', color: 'white', border: 'none', borderRadius: '4px',
                                    cursor: 'pointer', opacity: isExtracting ? 0.7 : 1
                                  }}
                                  disabled={isExtracting}
                                >
                                  {t('map.extract')}
                                </button>
                                <button
                                  onClick={() => toggleHistory(feature.id)}
                                  style={{
                                    flex: 1, padding: '6px', fontSize: '10px', fontWeight: 'bold',
                                    backgroundColor: isHistoryVisible ? '#f1f5f9' : 'white',
                                    color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isHistoryVisible ? t('profile.cancel') : t('map.history')}
                                </button>
                              </div>

                              {isHistoryVisible && (
                                <div style={{
                                  marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0',
                                  animation: 'slideDown 0.3s ease-out'
                                }}>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>{t('map.recentExtractions')}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(featureHistory[feature.id] || []).length > 0 ? (
                                      featureHistory[feature.id].map((h, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                                          <span>{h.time}</span>
                                          <span style={{ fontWeight: 'bold' }}>{h.val}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>{t('profile.noAreas')}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* MY FORESTVISION Panel */}
                {activeCategory === 'MY FORESTVISION' && (
                  <div className="panel-content">
                    <div className="panel-section">
                      <h4 className="panel-section-title">{t('profile.personalInfo').toUpperCase()}</h4>
                      <div className="account-info">
                        <div className="account-item">
                          <span className="account-label">{t('profile.savedAreas')}</span>
                          <span className="account-value">{JSON.parse(localStorage.getItem(getUserKey('savedAreas')) || '[]').length}</span>
                        </div>
                        <div className="account-item">
                          <span className="account-label">{t('map.reports')}</span>
                          <span className="account-value">{JSON.parse(localStorage.getItem(getUserKey('savedReports')) || '[]').length}</span>
                        </div>
                      </div>
                      <div className="account-actions">
                        <button className="account-btn" onClick={handleViewDashboard}>{t('nav.dashboard')}</button>
                        <button className="account-btn" onClick={handleLogout}>{t('profile.logout')}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEARCH Panel Content */}
                {activeCategory === 'SEARCH' && (
                  <SearchPanelContent
                    setSelectedRegion={setSelectedRegion}
                    setViewCoords={setViewCoords}
                    handleSaveArea={handleSaveArea}
                    onAnalysis={handleForestAnalysis}
                    analysisResults={searchAnalysisResults}
                    isAnalysisLoading={isSearchAnalysisLoading}
                    onClear={handleClearLayers}
                    selectedRegion={selectedRegion}
                    navTrigger={navTrigger}
                    setNavTrigger={setNavTrigger}
                    recentSearches={recentSearches}
                    onSearch={handleMapSearch}
                    showRecommendations={showSearchRecommendations}
                  />
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div >
  )
}

export default Map
