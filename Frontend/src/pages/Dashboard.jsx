import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import RiskZoneLayer from '../components/map/RiskZoneLayer'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useTranslation } from '../context/LanguageContext'
import { useNotification } from '../context/NotificationContext'
import { useEffect } from 'react'
import { fetchRegionData, fetchForestLossExcel } from '../services/api.js'
import { mlService } from '../services/mlService.js'
import { reportService } from '../services/reportService.js'
import { riskZoneApi } from '../services/riskZoneApi.js'
import { authService } from '../services/authService'
import * as XLSX from 'xlsx'
import { pakistanRegions, citySubRegions } from '../data/pakistanRegions'
import { regionCoordinates } from '../data/regionCoordinates'

// Component to handle map controls inside MapContainer
function DashboardMapControls() {
    const map = useMap()
    return (
        <div className="dashboard-map-controls">
            <button className="map-control-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">+</button>
            <button className="map-control-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">−</button>
        </div>
    )
}

// Share Icon SVG (matching Map page)
const ShareIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
);

const DynamicLegend = ({ items }) => (
    <div className="dynamic-legend" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px 25px',
        marginTop: '25px',
        padding: '15px 5px',
        borderTop: '1px solid #f1f5f9',
        justifyContent: 'flex-start'
    }}>
        {items.map((item, idx) => (
            <div key={idx} className="legend-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#64748b'
            }}>
                <span className="legend-color" style={{
                    width: item.shape === 'dash' ? '14px' : '10px',
                    height: item.shape === 'dash' ? '2px' : '10px',
                    backgroundColor: item.color,
                    borderRadius: item.shape === 'dash' ? '0' : '50%',
                    display: 'inline-block',
                    flexShrink: 0
                }}></span>
                <span className="legend-label" style={{ fontWeight: '500' }}>
                    {item.label}
                    {item.value && <span style={{ marginLeft: '5px', fontWeight: 'bold', color: '#334155' }}>{item.value}</span>}
                </span>
            </div>
        ))}
    </div>
);

function Dashboard() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState('SUMMARY')
    const [selectedRegion, setSelectedRegion] = useState('Pakistan')
    const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false)
    const { addNotification, notifications } = useNotification()
    const [isRiskLayerVisible, setIsRiskLayerVisible] = useState(true)
    const [riskOpacity, setRiskOpacity] = useState(0.7)
    const [thresholds, setThresholds] = useState({ high: 0.7, medium: 0.4 })

    // Helper for user-specific storage keys
    const getUserKey = (baseKey) => {
        const user = authService.getCurrentUser();
        return user ? `${user.id || user.email}_${baseKey}` : baseKey;
    };

    useEffect(() => {
        const fetchConfig = async () => {
            const accessToken = localStorage.getItem('accessToken');
            // Prevent 401 loop for guest users by only fetching if token exists
            if (!accessToken || accessToken === 'null') return;

            try {
                const config = await riskZoneApi.getConfig();
                if (config && config.deforestationRisk) {
                    setThresholds({
                        high: config.deforestationRisk.high / 100,
                        medium: config.deforestationRisk.medium / 100
                    });
                }
            } catch (err) {
                console.error("Dashboard: Config fetch failed", err);
            }
        };
        fetchConfig();
    }, []);

    // NEW API States
    const [regionData, setRegionData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch region data when selectedRegion changes
    useEffect(() => {
        const loadData = async () => {
            // Pakistan uses mock data only per user request - skip API fetch
            if (!selectedRegion || selectedRegion === 'Pakistan') {
                setRegionData(null);
                return;
            }

            setIsLoading(true)
            setError(null)
            try {
                const data = await fetchRegionData(selectedRegion)
                setRegionData(data)
            } catch (err) {
                console.error("API Error:", err)
                setError("Failed to load region data. Please check your connection or try again later.")
                addNotification({
                    type: 'error',
                    message: `Error loading data for ${selectedRegion}`
                })
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [selectedRegion, addNotification])

    const handleSaveArea = () => {
        if (!selectedRegion) return

        const storageKey = getUserKey('savedAreas');
        const savedAreas = JSON.parse(localStorage.getItem(storageKey) || '[]')
        const alreadySaved = savedAreas.find(area => area.name === selectedRegion)

        if (alreadySaved) {
            addNotification({
                type: 'info',
                message: t('profile.alreadySaved')
            })
            return
        }

        const newArea = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: selectedRegion,
            type: 'region',
            date: new Date().toISOString()
        }

        localStorage.setItem(storageKey, JSON.stringify([...savedAreas, newArea]))
        addNotification({
            type: 'success',
            message: t('profile.areaSaved')
        })
    }

    const handleShare = (val = '') => {
        const cardName = typeof val === 'string' ? val : '';
        const baseUrl = window.location.origin + window.location.pathname;
        const regionParam = `region=${encodeURIComponent(selectedRegion)}`;
        const cardParam = cardName ? `&card=${encodeURIComponent(cardName)}` : '';
        const url = `${baseUrl}?${regionParam}${cardParam}`;

        const shareTitle = cardName ? `${cardName} - ForestVision Dashboard` : 'ForestVision Dashboard';
        const shareText = cardName ? `Check out the ${cardName} metrics for ${selectedRegion} on ForestVision.` : `Check out the forest monitoring dashboard for ${selectedRegion}.`;

        if (navigator.share) {
            navigator.share({
                title: shareTitle,
                text: shareText,
                url: url
            }).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(url).then(() => {
                addNotification({
                    type: 'success',
                    message: t('dashboard.linkCopied') || 'Link copied to clipboard!'
                });
            }).catch(err => {
                console.error('Copy failed', err);
            });
        }
    };

    // NEW: ML Integration for Dashboard

    // NEW: ML Integration for Dashboard
    // const { mlService } = require('../services/mlService.js'); // Moved to top-level import

    const [mlData, setMlData] = useState(null);
    const [isMlLoading, setIsMlLoading] = useState(false);

    useEffect(() => {
        const fetchMlData = async () => {
            // Skip ML analysis for Pakistan per user request
            if (!selectedRegion || selectedRegion === 'Pakistan') return;

            setIsMlLoading(true);
            try {
                // CACHE-FIRST: Try to fetch cached analysis immediately
                console.log(`[Dashboard] Fetching cached analysis for ${selectedRegion}...`);
                const cachedAnalysis = await mlService.fetchLatestAnalysis(selectedRegion);

                if (cachedAnalysis) {
                    console.log(`[Dashboard] Cached analysis found for ${selectedRegion}. Age: ${cachedAnalysis.cache?.age_hours || 'unknown'} hours`);

                    const isStale = cachedAnalysis.cache_status?.stale || cachedAnalysis.cache_status?.expired;
                    setMlData(cachedAnalysis);

                    if (isStale) {
                        console.log(`[Dashboard] Cache is stale for ${selectedRegion}. Refreshing immediately...`);
                        try {
                            const refreshResult = await mlService.refreshAnalysis(selectedRegion);
                            if (refreshResult.success) {
                                console.log(`[Dashboard] Stale cache refreshed for ${selectedRegion}. Updating display.`);
                                setMlData(refreshResult.results);
                            }
                        } catch (err) {
                            console.warn(`[Dashboard] Immediate refresh failed for ${selectedRegion}:`, err);
                            // Fallback: Queue background refresh if immediate refresh fails
                            await mlService.queueRefreshIfStale(selectedRegion, cachedAnalysis);
                        }
                    }

                    setIsMlLoading(false);
                } else {
                    // NO CACHE: Trigger new prediction
                    console.log(`[Dashboard] No cached analysis for ${selectedRegion}. Triggering computation...`);
                    const result = await mlService.getPrediction(selectedRegion);
                    if (result.success) {
                        setMlData(result.results);
                    }
                    setIsMlLoading(false);
                }
            } catch (err) {
                console.error("Dashboard ML Error:", err);
                setIsMlLoading(false);
            }
        };
        fetchMlData();
    }, [selectedRegion]);

    const handleDownload = async () => {
        const currentData = getRegionData();

        if (!currentData || (!regionData && !mockRegionData[selectedRegion] && !mockRegionData['Pakistan'])) {
            addNotification({
                type: 'error',
                message: 'No data available to download.'
            });
            return;
        }

        const effectiveData = currentData;

        addNotification({
            type: 'info',
            message: t('dashboard.preparingDownload')
        });

        try {
            // Priority 1: Try fetching from Backend (for future integration)
            const blob = await fetchForestLossExcel(selectedRegion, effectiveData.annualLoss.years);

            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `ForestLossTrends_${selectedRegion}_${effectiveData.annualLoss.years.replace(/\s+/g, '')}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                addNotification({
                    type: 'success',
                    message: 'Excel report downloaded (from server).'
                });
                return;
            }

            // Priority 2: Fallback to Professional Client-Side Logic (SheetJS)
            // This ensures the button works even before the backend is fully live
            const data = effectiveData;
            const regionName = selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion;
            const lossYears = data.annualLoss.years;
            const lossArray = data.annualLoss.chart;
            const totalLoss = parseFloat(data.annualLoss.total.replace(/[^0-9.]/g, ''));
            const totalCO2 = parseFloat(data.annualLoss.co2.replace(/[^0-9.]/g, ''));
            const startPercent = parseFloat(data.summary.percent);
            const totalAreaGha = parseFloat(data.summary.area.replace(/[^0-9.]/g, '')) * 1000;

            const trendData = lossArray.map((loss, index) => {
                const year = 2001 + index;
                const prevLoss = index > 0 ? lossArray[index - 1] : loss;
                const changePrevYear = loss - prevLoss;
                const cumulativeLoss = lossArray.slice(0, index + 1).reduce((a, b) => a + b, 0);
                const remainingPercent = (startPercent - (cumulativeLoss / totalAreaGha) * 100).toFixed(2);

                let riskLevel = 'Low';
                if (loss > 25) riskLevel = 'High';
                else if (loss > 15) riskLevel = 'Medium';

                const estCO2 = ((loss / totalLoss) * totalCO2).toFixed(3);

                return {
                    'Country': regionName,
                    'Year': year,
                    'Forest Loss (Mha)': loss,
                    'Forest Cover Remaining (%)': remainingPercent + '%',
                    'Change Compared to Prev Year (Mha)': changePrevYear.toFixed(2),
                    'Est. CO₂ Emissions (Gt)': estCO2,
                    'Risk Level': riskLevel
                };
            });

            // Professional XLS generation via SheetJS
            const ws = XLSX.utils.json_to_sheet(trendData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Trend Analysis");

            // Add a summary row or metadata if needed
            XLSX.writeFile(wb, `Forest_Loss_Trend_Analysis_${selectedRegion.replace(/\s+/g, '_')}.xlsx`);

            addNotification({
                type: 'success',
                message: 'Forest Loss Trend Analysis Excel report downloaded.'
            });
        } catch (err) {
            console.error("Dashboard Download Error:", err);
            addNotification({
                type: 'error',
                message: 'Failed to generate trend analysis report'
            });
        }
    };

    const handleCardAction = (action, cardName) => {
        switch (action) {
            case 'Information':
            case 'ⓘ':
                addNotification({
                    type: 'info',
                    message: `${t('dashboard.infoFor') || 'Information for'} ${cardName}`
                });
                break;
            case 'Settings':
            case '⚙️':
                addNotification({
                    type: 'info',
                    message: `${t('dashboard.settingsFor') || 'Settings for'} ${cardName}`
                });
                break;
            case 'Add':
            case '📄':
                addNotification({
                    type: 'success',
                    message: `${t('dashboard.addedToReport') || 'Added to report:'} ${cardName}`
                });
                break;
            case 'Share':
            case '🔗':
            case 'Share Text':
                handleShare(cardName);
                break;
            case 'Download':
            case '⬇️':
                handleDownload();
                break;
            case 'Expand':
            case '⤢':
                addNotification({
                    type: 'info',
                    message: `${t('dashboard.expanding') || 'Expanding'} ${cardName}`
                });
                break;
            case 'Menu':
            case '⠇':
                addNotification({
                    type: 'info',
                    message: `${t('dashboard.moreOptionsFor') || 'More options for'} ${cardName}`
                });
                break;
            default:
                console.log(`Action ${action} clicked for ${cardName}`);
        }
    };

    // Mock data for dynamic content - Keeping as fallback or template
    const mockRegionData = {
        'Pakistan': {
            summary: { year: 2020, area: "3.7 Gha", percent: "28%", loss: "27 Mha", co2: "10 Gt" },
            primaryLoss: { years: "2002 to 2024", total: "83 Mha", percent: "16%", decrease: "8.0%", chart: [2.5, 2.4, 3.4, 3.2, 2.8, 2.9, 2.7, 2.8, 3.3, 2.7, 3.6, 2.6, 3.4, 2.9, 6.1, 5.0, 3.6, 3.7, 4.2, 3.8, 4.1, 3.7, 6.8] },
            annualLoss: { years: "2001 to 2024", total: "520 Mha", percent: "13%", co2: "220 Gt", chart: [13, 16, 14, 20, 18, 17, 18, 18, 17, 18, 17, 23, 20, 24, 19, 30, 29, 25, 24, 26, 25, 23, 28, 30] },
            drivers: { percent: "34%", commodities: "4.7 Mha", agriculture: "170 Mha", infrastructure: "4.5 Mha", logging: "130 Mha", natural: "7.3 Mha", wildfire: "150 Mha", shifting: "49 Mha" },
            netChange: { years: "2000 to 2020", total: "-100 Mha", percent: "-2.4%", stable: "3.6 Gha", gain: "130 Mha", loss: "230 Mha", disturbed: "310 Mha", grad: "#7cac44 0% 84.3%, #5c65a0 84.3% 87.3%, #a3539b 87.3% 92.7%, #f68160 92.7% 100%" },
            landCover: {
                natural: { year: 2020, naturalPercent: "28%", nonNaturalPercent: "2.0%", naturalArea: "3.7 Gha", nonNaturalArea: "260 Mha", otherArea: "9.3 Gha", grad: "#2d6a3e 0% 28%, #92d0ab 28% 30%, #cccccc 30% 100%" },
                treeCover: { year: 2000, treeCoverPercent: "30%", treeCoverArea: "4.0 Gha", otherArea: "9.2 Gha", grad: "#4b611c 0% 30.3%, #e2e7a1 30.3% 100%" },
                location: { year: 2010, topCount: "5", topPercent: "55%", topRegion: "KPK", topArea: "1.2 Gha", avgArea: "0.6 Gha", rankings: [{ rank: 1, name: 'Khyber Pakhtunkhwa', value: '1.2 Gha' }, { rank: 2, name: 'Punjab', value: '0.9 Gha' }, { rank: 3, name: 'Sindh', value: '0.7 Gha' }, { rank: 4, name: 'Balochistan', value: '0.5 Gha' }, { rank: 5, name: 'AJK', value: '0.4 Gha' }] },
                intact: { year: 2000, intactPercent: "8.0%", intactArea: "1.0 Gha", otherTreeArea: "3.0 Gha", nonForestArea: "9.2 Gha", grad: "#4b611c 0% 7.6%, #97bd3d 7.6% 30%, #e2e7a1 30% 100%" },
                fao: { year: 2020, forestPercent: "31%", forestArea: "4.1 Gha", primaryPercent: "9.0%", primaryArea: "1.1 Gha", plantedArea: "290 Mha", otherArea: "2.7 Gha", nonForestArea: "9.0 Gha", grad: "#6f9c3f 0% 8.4%, #9fbf48 8.4% 10.6%, #c8d96f 10.6% 31.2%, #eff3c6 31.2% 100%" }
            },
            forestChange: {
                naturalLoss: { years: "2021 to 2024", naturalPercent: "88%", totalLoss: "95Mha", co2: "36 Gt", chart: [{ year: 2021, val: 26 }, { year: 2022, val: 24 }, { year: 2023, val: 28 }, { year: 2024, val: 30 }] },
                lossRankings: { years: "2001 to 2024", topRegion: "Punjab", lossArea: "12 Mha", baseYear: 2000, basePercent: "12%", rankings: [{ rank: 1, name: 'Punjab', value: '12 Mha' }, { rank: 2, name: 'Sindh', value: '8 Mha' }, { rank: 3, name: 'KPK', value: '6 Mha' }, { rank: 4, name: 'AJK', value: '4 Mha' }, { rank: 5, name: 'Balochistan', value: '2 Mha' }] },
                deforestationRankings: { years: "2015 to 2020", rate: "7.5 Mha", rankings: [{ rank: 1, name: 'Punjab', value: '1.7 Mha/year' }, { rank: 2, name: 'Sindh', value: '670 kha/year' }, { rank: 3, name: 'KPK', value: '650 kha/year' }, { rank: 4, name: 'AJK', value: '470 kha/year' }, { rank: 5, name: 'GB', value: '290 kha/year' }] },
                gainRankings: { years: "2000 to 2020", totalGain: "130 Mha", rankings: [{ rank: 1, name: 'Punjab', value: '37 Mha' }, { rank: 2, name: 'Sindh', value: '17 Mha' }, { rank: 3, name: 'KPK', value: '14 Mha' }, { rank: 4, name: 'GB', value: '8 Mha' }, { rank: 5, name: 'ICT', value: '6 Mha' }] },
                reforestationRankings: { years: "15 to 20", globalRate: "5.5 Mha", rankings: [{ rank: 1, name: 'Punjab', value: '940 kha/yr' }, { rank: 2, name: 'Sindh', value: '690 kha/yr' }, { rank: 3, name: 'KPK', value: '500 kha/yr' }, { rank: 4, name: 'GB', value: '430 kha/yr' }, { rank: 5, name: 'AJK', value: '280 kha/yr' }] },
                gainOutside: { years: "2000 to 2020", outsidePercent: "86%", outsideArea: "110 Mha", withinArea: "19 Mha", grad: "#5a3fd6 0% 86%, #bcaafc 86% 100%" }
            },
            climate: {
                fluxes: { years: "2001 to 2024", emitted: "9.2 Gt", removed: "-14 Gt", net: "-5.3 Gt", type: "net sink", bars: { removed: 14, emitted: 9.2, netRemovals: 5.3 } },
                drivers: { years: "2001 to 2024", avg: "3.8 Gt", items: { commodities: "98 Mt", agriculture: "3.6 Gt", infrastructure: "77 Mt", logging: "2.4 Gt", natural: "120 Mt", wildfire: "1.6 Gt", shifting: "1.2 Gt" }, grad: "#f3ad28 0% 40%, #5c8a38 40% 65%, #b57d38 65% 82%, #e3d234 82% 95%, #e96d6d 95% 96%, #a660a1 96% 97%, #4a48b8 97% 100%" },
                biomass: { topPercent: "49%", rankings: [{ rank: 1, name: 'Punjab', value: '120 Gt' }, { rank: 2, name: 'KPK', value: '62 Gt' }, { rank: 3, name: 'Sindh', value: '43 Gt' }, { rank: 4, name: 'GB', value: '43 Gt' }, { rank: 5, name: 'AJK', value: '37 Gt' }] },
                soilCarbon: { topPercent: "55%", rankings: [{ rank: 1, name: 'KPK', value: '55 Gt' }, { rank: 2, name: 'GB', value: '26 Gt' }, { rank: 3, name: 'Punjab', value: '25 Gt' }, { rank: 4, name: 'AJK', value: '16 Gt' }, { rank: 5, name: 'Sindh', value: '11 Gt' }] }
            }
        },
        'Punjab': {
            summary: { year: 2020, area: "1.2 Gha", percent: "15%", loss: "8.5 Mha", co2: "3.2 Gt" },
            primaryLoss: { years: "2002 to 2024", total: "22 Mha", percent: "12%", decrease: "5.5%", chart: [1.2, 1.4, 1.1, 1.5, 1.3, 1.6, 1.4, 1.5, 1.7, 1.3, 1.8, 1.4, 1.6, 1.5, 3.1, 2.5, 1.8, 1.9, 2.1, 1.9, 2.0, 1.8, 3.4] },
            annualLoss: { years: "2001 to 2024", total: "140 Mha", percent: "9%", co2: "58 Gt", chart: [8, 9, 8, 11, 10, 9, 10, 10, 9, 10, 9, 12, 11, 13, 10, 16, 15, 13, 12, 14, 13, 12, 15, 16] },
            drivers: { percent: "42%", commodities: "1.2 Mha", agriculture: "85 Mha", infrastructure: "2.1 Mha", logging: "35 Mha", natural: "2.1 Mha", wildfire: "25 Mha", shifting: "15 Mha" },
            netChange: { years: "2000 to 2020", total: "-45 Mha", percent: "-1.8%", stable: "1.1 Gha", gain: "45 Mha", loss: "90 Mha", disturbed: "110 Mha", grad: "#7cac44 0% 80%, #5c65a0 80% 84%, #a3539b 84% 92%, #f68160 92% 100%" },
            landCover: {
                natural: { year: 2020, naturalPercent: "15%", nonNaturalPercent: "1.5%", naturalArea: "1.2 Gha", nonNaturalArea: "120 Mha", otherArea: "6.7 Gha", grad: "#2d6a3e 0% 15%, #92d0ab 15% 16.5%, #cccccc 16.5% 100%" },
                treeCover: { year: 2000, treeCoverPercent: "18%", treeCoverArea: "1.4 Gha", otherArea: "6.6 Gha", grad: "#4b611c 0% 18%, #e2e7a1 18% 100%" },
                location: { year: 2010, topCount: "3", topPercent: "65%", topRegion: "Rawalpindi", topArea: "450 Mha", avgArea: "120 Mha", rankings: [{ rank: 1, name: 'Rawalpindi', value: '450 Mha' }, { rank: 2, name: 'Murree', value: '320 Mha' }, { rank: 3, name: 'Attock', value: '210 Mha' }, { rank: 4, name: 'Jhelum', value: '150 Mha' }, { rank: 5, name: 'Chakwal', value: '100 Mha' }] },
                intact: { year: 2000, intactPercent: "4.5%", intactArea: "0.3 Gha", otherTreeArea: "1.1 Gha", nonForestArea: "6.6 Gha", grad: "#4b611c 0% 4.5%, #97bd3d 4.5% 20%, #e2e7a1 20% 100%" },
                fao: { year: 2020, forestPercent: "16%", forestArea: "1.3 Gha", primaryPercent: "4.0%", primaryArea: "0.3 Gha", plantedArea: "90 Mha", otherArea: "0.9 Gha", nonForestArea: "6.7 Gha", grad: "#6f9c3f 0% 4%, #9fbf48 4% 6%, #c8d96f 6% 16%, #eff3c6 16% 100%" }
            },
            forestChange: {
                naturalLoss: { years: "2021 to 2024", naturalPercent: "75%", totalLoss: "28Mha", co2: "12 Gt", chart: [{ year: 2021, val: 6 }, { year: 2022, val: 5 }, { year: 2023, val: 8 }, { year: 2024, val: 9 }] },
                lossRankings: { years: "2001 to 2024", topRegion: "Rawalpindi", lossArea: "4 Mha", baseYear: 2000, basePercent: "8%", rankings: [{ rank: 1, name: 'Rawalpindi', value: '4 Mha' }, { rank: 2, name: 'Attock', value: '2 Mha' }, { rank: 3, name: 'Jhelum', value: '1.5 Mha' }, { rank: 4, name: 'Chakwal', value: '1 Mha' }, { rank: 5, name: 'Gujrat', value: '0.5 Mha' }] },
                deforestationRankings: { years: "2015 to 2020", rate: "1.2 Mha", rankings: [{ rank: 1, name: 'Rawalpindi', value: '350 kha/year' }, { rank: 2, name: 'Attock', value: '210 kha/year' }, { rank: 3, name: 'Jhelum', value: '180 kha/year' }, { rank: 4, name: 'Chakwal', value: '120 kha/year' }, { rank: 5, name: 'Gujrat', value: '90 kha/year' }] },
                gainRankings: { years: "2000 to 2020", totalGain: "45 Mha", rankings: [{ rank: 1, name: 'Rawalpindi', value: '12 Mha' }, { rank: 2, name: 'Multan', value: '8 Mha' }, { rank: 3, name: 'Lahore', value: '6 Mha' }, { rank: 4, name: 'Faisalabad', value: '4 Mha' }, { rank: 5, name: 'Sargodha', value: '2 Mha' }] },
                reforestationRankings: { years: "15 to 20", globalRate: "1.5 Mha", rankings: [{ rank: 1, name: 'Rawalpindi', value: '240 kha/yr' }, { rank: 2, name: 'Multan', value: '190 kha/yr' }, { rank: 3, name: 'Lahore', value: '150 kha/yr' }, { rank: 4, name: 'Faisalabad', value: '80 kha/yr' }, { rank: 5, name: 'Sargodha', value: '50 kha/yr' }] },
                gainOutside: { years: "2000 to 2020", outsidePercent: "72%", outsideArea: "32 Mha", withinArea: "13 Mha", grad: "#5a3fd6 0% 72%, #bcaafc 72% 100%" }
            },
            climate: {
                fluxes: { years: "2001 to 2024", emitted: "3.2 Gt", removed: "-4.5 Gt", net: "-1.3 Gt", type: "sink", bars: { removed: 4.5, emitted: 3.2, netRemovals: 1.3 } },
                drivers: { years: "2001 to 2024", avg: "1.2 Gt", items: { commodities: "25 Mt", agriculture: "0.9 Gt", infrastructure: "15 Mt", logging: "0.6 Gt", natural: "45 Mt", wildfire: "0.4 Gt", shifting: "0.3 Gt" }, grad: "#f3ad28 0% 35%, #5c8a38 35% 55%, #b57d38 55% 70%, #e3d234 70% 85%, #e96d6d 85% 90%, #a660a1 90% 95%, #4a48b8 95% 100%" },
                biomass: { topPercent: "35%", rankings: [{ rank: 1, name: 'Rawalpindi', value: '45 Gt' }, { rank: 2, name: 'Murree', value: '32 Gt' }, { rank: 3, name: 'Attock', value: '12 Gt' }, { rank: 4, name: 'Jhelum', value: '8 Gt' }, { rank: 5, name: 'Chakwal', value: '5 Gt' }] },
                soilCarbon: { topPercent: "42%", rankings: [{ rank: 1, name: 'Rawalpindi', value: '18 Gt' }, { rank: 2, name: 'Murree', value: '12 Gt' }, { rank: 3, name: 'Attock', value: '8 Gt' }, { rank: 4, name: 'Jhelum', value: '5 Gt' }, { rank: 5, name: 'Chakwal', value: '3 Gt' }] }
            }
        },
        'Sindh': {
            summary: { year: 2020, area: "0.8 Gha", percent: "10%", loss: "4.2 Mha", co2: "1.8 Gt" },
            primaryLoss: { years: "2002 to 2024", total: "12 Mha", percent: "8%", decrease: "3.2%", chart: [0.5, 0.6, 0.4, 0.7, 0.6, 0.8, 0.7, 0.7, 0.9, 0.7, 1.0, 0.8, 0.9, 0.8, 1.6, 1.3, 0.9, 1.0, 1.1, 1.0, 1.1, 0.9, 1.8] },
            annualLoss: { years: "2001 to 2024", total: "85 Mha", percent: "6%", co2: "32 Gt", chart: [4, 5, 4, 6, 5, 5, 6, 6, 5, 6, 5, 7, 6, 8, 6, 9, 8, 7, 7, 8, 7, 7, 8, 9] },
            drivers: { percent: "28%", commodities: "0.5 Mha", agriculture: "42 Mha", infrastructure: "0.8 Mha", logging: "12 Mha", natural: "0.7 Mha", wildfire: "12 Mha", shifting: "8 Mha" },
            netChange: { years: "2000 to 2020", total: "-12 Mha", percent: "-0.9%", stable: "0.75 Gha", gain: "12 Mha", loss: "24 Mha", disturbed: "45 Mha", grad: "#7cac44 0% 90%, #5c65a0 90% 92%, #a3539b 92% 96%, #f68160 96% 100%" },
            landCover: {
                natural: { year: 2020, naturalPercent: "10%", nonNaturalPercent: "0.8%", naturalArea: "0.8 Gha", nonNaturalArea: "65 Mha", otherArea: "7.1 Gha", grad: "#2d6a3e 0% 10%, #92d0ab 10% 10.8%, #cccccc 10.8% 100%" },
                treeCover: { year: 2000, treeCoverPercent: "12%", treeCoverArea: "0.9 Gha", otherArea: "7.0 Gha", grad: "#4b611c 0% 12%, #e2e7a1 12% 100%" },
                location: { year: 2010, topCount: "2", topPercent: "45%", topRegion: "Thatta", topArea: "120 Mha", avgArea: "45 Mha", rankings: [{ rank: 1, name: 'Thatta', value: '120 Mha' }, { rank: 2, name: 'Sujawal', value: '95 Mha' }, { rank: 3, name: 'Badin', value: '65 Mha' }, { rank: 4, name: 'Karachi', value: '45 Mha' }, { rank: 5, name: 'Hyderabad', value: '25 Mha' }] },
                intact: { year: 2000, intactPercent: "2.1%", intactArea: "0.15 Gha", otherTreeArea: "0.75 Gha", nonForestArea: "7.1 Gha", grad: "#4b611c 0% 2.1%, #97bd3d 2.1% 12%, #e2e7a1 12% 100%" },
                fao: { year: 2020, forestPercent: "11%", forestArea: "0.85 Gha", primaryPercent: "2.5%", primaryArea: "0.2 Gha", plantedArea: "50 Mha", otherArea: "0.6 Gha", nonForestArea: "7 Gha", grad: "#6f9c3f 0% 2.5%, #9fbf48 2.5% 4%, #c8d96f 4% 11%, #eff3c6 11% 100%" }
            },
            forestChange: {
                naturalLoss: { years: "2021 to 2024", naturalPercent: "65%", totalLoss: "12Mha", co2: "5 Gt", chart: [{ year: 2021, val: 3 }, { year: 2022, val: 2 }, { year: 2023, val: 3 }, { year: 2024, val: 4 }] },
                lossRankings: { years: "2001 to 2024", topRegion: "Thatta", lossArea: "1.2 Mha", baseYear: 2000, basePercent: "5%", rankings: [{ rank: 1, name: 'Thatta', value: '1.2 Mha' }, { rank: 2, name: 'Badin', value: '0.8 Mha' }, { rank: 3, name: 'Sujawal', value: '0.7 Mha' }, { rank: 4, name: 'Karachi', value: '0.5 Mha' }, { rank: 5, name: 'Jamshoro', value: '0.3 Mha' }] },
                deforestationRankings: { years: "2015 to 2020", rate: "0.6 Mha", rankings: [{ rank: 1, name: 'Thatta', value: '110 kha/year' }, { rank: 2, name: 'Badin', value: '85 kha/year' }, { rank: 3, name: 'Sujawal', value: '75 kha/year' }, { rank: 4, name: 'Karachi', value: '55 kha/year' }, { rank: 5, name: 'Hyderabad', value: '35 kha/year' }] },
                gainRankings: { years: "2000 to 2020", totalGain: "12 Mha", rankings: [{ rank: 1, name: 'Thatta', value: '4 Mha' }, { rank: 2, name: 'Karachi', value: '2 Mha' }, { rank: 3, name: 'Hyderabad', value: '1.5 Mha' }, { rank: 4, name: 'Sujawal', value: '1 Mha' }, { rank: 5, name: 'Badin', value: '0.5 Mha' }] },
                reforestationRankings: { years: "15 to 20", globalRate: "0.8 Mha", rankings: [{ rank: 1, name: 'Thatta', value: '85 kha/yr' }, { rank: 2, name: 'Karachi', value: '65 kha/yr' }, { rank: 3, name: 'Hyderabad', value: '55 kha/yr' }, { rank: 4, name: 'Sujawal', value: '45 kha/yr' }, { rank: 5, name: 'Badin', value: '25 kha/yr' }] },
                gainOutside: { years: "2000 to 2020", outsidePercent: "92%", outsideArea: "11 Mha", withinArea: "1 Mha", grad: "#5a3fd6 0% 92%, #bcaafc 92% 100%" }
            },
            climate: {
                fluxes: { years: "2001 to 2024", emitted: "1.5 Gt", removed: "-2.2 Gt", net: "-0.7 Gt", type: "sink", bars: { removed: 2.2, emitted: 1.5, netRemovals: 0.7 } },
                drivers: { years: "2001 to 2024", avg: "0.6 Gt", items: { commodities: "12 Mt", agriculture: "0.4 Gt", infrastructure: "10 Mt", logging: "0.1 Gt", natural: "25 Mt", wildfire: "0.1 Gt", shifting: "0.1 Gt" }, grad: "#f3ad28 0% 30%, #5c8a38 30% 50%, #b57d38 50% 65%, #e3d234 65% 80%, #e96d6d 80% 85%, #a660a1 85% 90%, #4a48b8 90% 100%" },
                biomass: { topPercent: "28%", rankings: [{ rank: 1, name: 'Thatta', value: '15 Gt' }, { rank: 2, name: 'Sujawal', value: '10 Gt' }, { rank: 3, name: 'Badin', value: '8 Gt' }, { rank: 4, name: 'Karachi', value: '5 Gt' }, { rank: 5, name: 'Jamshoro', value: '2 Gt' }] },
                soilCarbon: { topPercent: "32%", rankings: [{ rank: 1, name: 'Thatta', value: '6 Gt' }, { rank: 2, name: 'Badin', value: '4 Gt' }, { rank: 3, name: 'Sujawal', value: '3 Gt' }, { rank: 4, name: 'Karachi', value: '2 Gt' }, { rank: 5, name: 'Hyderabad', value: '1 Gt' }] }
            }
        },
        'Lahore': {
            summary: { year: 2020, area: "45 Kha", percent: "5%", loss: "1.2 Kha", co2: "450 Mt" },
            primaryLoss: { years: "2002 to 2024", total: "2.5 Kha", percent: "4%", decrease: "1.5%", chart: [0.1, 0.1, 0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2, 0.1, 0.2, 0.2, 0.4, 0.3, 0.2, 0.2, 0.3, 0.2, 0.2, 0.2, 0.5] },
            annualLoss: { years: "2001 to 2024", total: "12 Kha", percent: "3%", co2: "5 Gt", chart: [0.5, 0.6, 0.5, 0.8, 0.7, 0.6, 0.7, 0.7, 0.6, 0.7, 0.6, 0.9, 0.8, 1.0, 0.7, 1.2, 1.1, 1.0, 0.9, 1.0, 1.0, 0.9, 1.1, 1.2] },
            drivers: { percent: "65%", commodities: "0.1 Mha", agriculture: "5 Mha", infrastructure: "1.2 Mha", logging: "2 Mha", natural: "0.1 Mha", wildfire: "0.5 Mha", shifting: "0.2 Mha" },
            netChange: { years: "2000 to 2020", total: "-1.2 Kha", percent: "-0.5%", stable: "40 Kha", gain: "1.2 Kha", loss: "2.4 Kha", disturbed: "5 Kha", grad: "#7cac44 0% 85%, #5c65a0 85% 88%, #a3539b 88% 94%, #f68160 94% 100%" },
            landCover: {
                natural: { year: 2020, naturalPercent: "5%", nonNaturalPercent: "0.5%", naturalArea: "45 Kha", nonNaturalArea: "5 Kha", otherArea: "850 Kha", grad: "#2d6a3e 0% 5%, #92d0ab 5% 5.5%, #cccccc 5.5% 100%" },
                treeCover: { year: 2000, treeCoverPercent: "6%", treeCoverArea: "50 Kha", otherArea: "840 Kha", grad: "#4b611c 0% 6%, #e2e7a1 6% 100%" },
                location: { year: 2010, topCount: "1", topPercent: "35%", topRegion: "Cantonment", topArea: "15 Kha", avgArea: "8 Kha", rankings: [{ rank: 1, name: 'Cantonment', value: '15 Kha' }, { rank: 2, name: 'Model Town', value: '10 Kha' }, { rank: 3, name: 'Gulberg', value: '8 Kha' }, { rank: 4, name: 'Ravi', value: '6 Kha' }, { rank: 5, name: 'Shalimar', value: '4 Kha' }] },
                intact: { year: 2000, intactPercent: "1.2%", intactArea: "2 Kha", otherTreeArea: "48 Kha", nonForestArea: "850 Kha", grad: "#4b611c 0% 1.2%, #97bd3d 1.2% 6%, #e2e7a1 6% 100%" },
                fao: { year: 2020, forestPercent: "5.5%", forestArea: "52 Kha", primaryPercent: "0.8%", primaryArea: "1 Kha", plantedArea: "5 Kha", otherArea: "10 Kha", nonForestArea: "840 Kha", grad: "#6f9c3f 0% 1%, #9fbf48 1% 2%, #c8d96f 2% 5.5%, #eff3c6 5.5% 100%" }
            },
            forestChange: {
                naturalLoss: { years: "2021 to 2024", naturalPercent: "45%", totalLoss: "1.2Kha", co2: "450 Mt", chart: [{ year: 2021, val: 0.3 }, { year: 2022, val: 0.2 }, { year: 2023, val: 0.3 }, { year: 2024, val: 0.4 }] },
                lossRankings: { years: "2001 to 2024", topRegion: "Cantonment", lossArea: "0.5 Kha", baseYear: 2000, basePercent: "2%", rankings: [{ rank: 1, name: 'Cantonment', value: '0.5 Kha' }, { rank: 2, name: 'Model Town', value: '0.3 Kha' }, { rank: 3, name: 'Gulberg', value: '0.2 Kha' }, { rank: 4, name: 'Ravi', value: '0.1 Kha' }, { rank: 5, name: 'Shalimar', value: '0.05 Kha' }] },
                deforestationRankings: { years: "2015 to 2020", rate: "0.1 Kha", rankings: [{ rank: 1, name: 'Cantonment', value: '25 ha/year' }, { rank: 2, name: 'Model Town', value: '18 ha/year' }, { rank: 3, name: 'Gulberg', value: '15 ha/year' }, { rank: 4, name: 'Ravi', value: '10 ha/year' }, { rank: 5, name: 'Shalimar', value: '5 ha/year' }] },
                gainRankings: { years: "2000 to 2020", totalGain: "1.2 Kha", rankings: [{ rank: 1, name: 'Model Town', value: '0.4 Kha' }, { rank: 2, name: 'Gulberg', value: '0.3 Kha' }, { rank: 3, name: 'Cantonment', value: '0.2 Kha' }, { rank: 4, name: 'Ravi', value: '0.2 Kha' }, { rank: 5, name: 'Shalimar', value: '0.1 Kha' }] },
                reforestationRankings: { years: "15 to 20", globalRate: "0.1 Kha", rankings: [{ rank: 1, name: 'Model Town', value: '22 ha/yr' }, { rank: 2, name: 'Gulberg', value: '18 ha/yr' }, { rank: 3, name: 'Cantonment', value: '15 ha/yr' }, { rank: 4, name: 'Ravi', value: '12 ha/yr' }, { rank: 5, name: 'Shalimar', value: '8 ha/yr' }] },
                gainOutside: { years: "2000 to 2020", outsidePercent: "95%", outsideArea: "1.1 Kha", withinArea: "0.1 Kha", grad: "#5a3fd6 0% 95%, #bcaafc 95% 100%" }
            },
            climate: {
                fluxes: { years: "2001 to 2024", emitted: "450 Mt", removed: "-650 Mt", net: "-200 Mt", type: "sink", bars: { removed: 0.65, emitted: 0.45, netRemovals: 0.2 } },
                drivers: { years: "2001 to 2024", avg: "0.1 Gt", items: { commodities: "1 Mt", agriculture: "0.05 Gt", infrastructure: "15 Mt", logging: "5 Mt", natural: "5 Mt", wildfire: "1 Mt", shifting: "1 Mt" }, grad: "#f3ad28 0% 20%, #5c8a38 20% 40%, #b57d38 40% 60%, #e3d234 60% 80%, #e96d6d 80% 85%, #a660a1 85% 90%, #4a48b8 90% 100%" },
                biomass: { topPercent: "15%", rankings: [{ rank: 1, name: 'Cantonment', value: '500 Kt' }, { rank: 2, name: 'Model Town', value: '400 Kt' }, { rank: 3, name: 'Gulberg', value: '300 Kt' }, { rank: 4, name: 'Ravi', value: '200 Kt' }, { rank: 5, name: 'Shalimar', value: '100 Kt' }] },
                soilCarbon: { topPercent: "22%", rankings: [{ rank: 1, name: 'Cantonment', value: '150 Kt' }, { rank: 2, name: 'Model Town', value: '120 Kt' }, { rank: 3, name: 'Gulberg', value: '100 Kt' }, { rank: 4, name: 'Ravi', value: '80 Kt' }, { rank: 5, name: 'Shalimar', value: '50 Kt' }] }
            }
        }
    }

    // Dynamic helpers for geographic regions
    const getRegionType = (name) => {
        if (!name || name === 'Pakistan') return 'country';
        const provNames = [
            'Khyber Pakhtunkhwa (KP)', 'Khyber Pakhtunkhwa', 'KP', 'KPK',
            'Islamabad Capital Territory & Margalla Region', 'Islamabad Capital Territory',
            'Punjab', 'Sindh', 'Balochistan', 'Gilgit-Baltistan (GB)', 'Gilgit-Baltistan', 'GB',
            'Azad Jammu & Kashmir (AJK)', 'Azad Kashmir', 'AJK'
        ];
        if (provNames.some(p => p.toLowerCase() === name.toLowerCase())) {
            return 'province';
        }
        if (citySubRegions[name]) {
            return 'city';
        }
        for (const subRegs of Object.values(citySubRegions)) {
            if (subRegs.some(s => s.toLowerCase() === name.toLowerCase())) {
                return 'sub-region';
            }
        }
        return 'city';
    };

    const getStringHash = (str) => {
        let hash = 0;
        if (!str) return hash;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const generateDynamicRegionData = (regionName) => {
        if (mockRegionData[regionName]) {
            return { ...mockRegionData[regionName] };
        }

        const base = { ...mockRegionData['Pakistan'] };
        const rType = getRegionType(regionName);
        const hash = getStringHash(regionName);

        let divisor = 1;
        let unit = 'Mha';
        let summaryUnit = 'Gha';
        let co2Unit = 'Gt';

        if (rType === 'province') {
            divisor = 5 + (hash % 11);
            unit = 'Mha';
            summaryUnit = 'Gha';
            co2Unit = 'Gt';
        } else if (rType === 'city') {
            divisor = 1000 + (hash % 4001);
            unit = 'Kha';
            summaryUnit = 'Kha';
            co2Unit = 'Mt';
        } else if (rType === 'sub-region') {
            divisor = 15000 + (hash % 35001);
            unit = 'ha';
            summaryUnit = 'ha';
            co2Unit = 'Kt';
        }

        const varyValue = (val, salt = 0, pct = 0.15) => {
            const factor = 1 - pct + (((hash + salt) % 100) / 100) * (pct * 2);
            return val * factor;
        };

        const formatArea = (valInMha, targetUnit) => {
            if (targetUnit === 'Gha') return `${(valInMha / 1000).toFixed(2)} Gha`;
            if (targetUnit === 'Mha') return `${valInMha.toFixed(1)} Mha`;
            if (targetUnit === 'Kha') return `${(valInMha * 10).toFixed(1)} Kha`;
            if (targetUnit === 'ha') return `${Math.round(valInMha * 10000)} ha`;
            return `${valInMha.toFixed(1)} Mha`;
        };

        const formatCO2 = (valInGt, targetUnit) => {
            if (targetUnit === 'Gt') return `${valInGt.toFixed(1)} Gt`;
            if (targetUnit === 'Mt') return `${(valInGt * 1000).toFixed(0)} Mt`;
            if (targetUnit === 'Kt') return `${(valInGt * 1000000).toFixed(0)} Kt`;
            return `${valInGt.toFixed(1)} Gt`;
        };

        const scaledAreaMha = varyValue(3700 / divisor, 1);
        const scaledLossMha = varyValue(27 / divisor, 2);
        const scaledPrimaryLossMha = varyValue(83 / divisor, 3);
        const scaledAnnualLossMha = varyValue(520 / divisor, 4);
        const scaledCO2Gt = varyValue(10 / divisor, 5);
        const scaledAnnualCO2Gt = varyValue(220 / divisor, 6);

        const forestPct = Math.round(varyValue(25, 7, 0.4));
        const lossPct = Math.round(varyValue(15, 8, 0.3));
        const decreasePct = varyValue(8.0, 9, 0.2).toFixed(1);

        const primaryChart = base.primaryLoss.chart.map(val => varyValue(val / divisor, val * 10, 0.1));
        const annualChart = base.annualLoss.chart.map(val => varyValue(val / divisor, val * 20, 0.1));

        const scaledStableMha = scaledAreaMha * (forestPct / 100);
        const scaledGainMha = scaledLossMha * varyValue(0.55, 10, 0.2);
        const scaledNetChangeMha = scaledGainMha - scaledLossMha;

        return {
            summary: {
                year: 2020,
                area: formatArea(scaledAreaMha, summaryUnit),
                percent: `${forestPct}%`,
                loss: formatArea(scaledLossMha, unit),
                co2: formatCO2(scaledCO2Gt, co2Unit)
            },
            primaryLoss: {
                years: "2002 to 2024",
                total: formatArea(scaledPrimaryLossMha, unit),
                percent: `${lossPct}%`,
                decrease: `${decreasePct}%`,
                chart: primaryChart
            },
            annualLoss: {
                years: "2001 to 2024",
                total: formatArea(scaledAnnualLossMha, unit),
                percent: `${Math.round(varyValue(13, 11, 0.25))}%`,
                co2: formatCO2(scaledAnnualCO2Gt, co2Unit),
                chart: annualChart
            },
            drivers: {
                percent: `${Math.round(varyValue(34, 12, 0.25))}%`,
                commodities: formatArea(varyValue(4.7 / divisor, 13), unit),
                agriculture: formatArea(varyValue(170 / divisor, 14), unit),
                infrastructure: formatArea(varyValue(4.5 / divisor, 15), unit),
                logging: formatArea(varyValue(130 / divisor, 16), unit),
                natural: formatArea(varyValue(7.3 / divisor, 17), unit),
                wildfire: formatArea(varyValue(150 / divisor, 18), unit),
                shifting: formatArea(varyValue(49 / divisor, 19), unit)
            },
            netChange: {
                years: "2000 to 2020",
                total: formatArea(scaledNetChangeMha, unit),
                percent: `${varyValue(-2.4, 20, 0.2).toFixed(1)}%`,
                stable: formatArea(scaledStableMha, summaryUnit),
                gain: formatArea(scaledGainMha, unit),
                loss: formatArea(scaledLossMha, unit),
                disturbed: formatArea(varyValue(310 / divisor, 21), unit),
                grad: base.netChange.grad
            },
            landCover: {
                natural: {
                    year: 2020,
                    naturalPercent: `${forestPct}%`,
                    nonNaturalPercent: `${varyValue(2.0, 22, 0.3).toFixed(1)}%`,
                    naturalArea: formatArea(scaledStableMha, summaryUnit),
                    nonNaturalArea: formatArea(varyValue(260 / divisor, 23), unit),
                    otherArea: formatArea(scaledAreaMha * (1 - forestPct/100), summaryUnit),
                    grad: base.landCover.natural.grad
                },
                treeCover: {
                    year: 2000,
                    treeCoverPercent: `${forestPct + 2}%`,
                    treeCoverArea: formatArea(scaledStableMha * 1.1, summaryUnit),
                    otherArea: formatArea(scaledAreaMha * (1 - (forestPct+2)/100), summaryUnit),
                    grad: base.landCover.treeCover.grad
                },
                location: {
                    year: 2010,
                    topCount: "5",
                    topPercent: `${Math.round(varyValue(55, 24, 0.15))}%`,
                    topRegion: regionName,
                    topArea: formatArea(scaledStableMha * 0.3, summaryUnit),
                    avgArea: formatArea(scaledStableMha * 0.15, summaryUnit),
                    rankings: []
                },
                intact: {
                    year: 2000,
                    intactPercent: `${varyValue(8.0, 25, 0.4).toFixed(1)}%`,
                    intactArea: formatArea(scaledStableMha * 0.25, summaryUnit),
                    otherTreeArea: formatArea(scaledStableMha * 0.75, summaryUnit),
                    nonForestArea: formatArea(scaledAreaMha * (1 - forestPct/100), summaryUnit),
                    grad: base.landCover.intact.grad
                },
                fao: {
                    year: 2020,
                    forestPercent: `${forestPct + 3}%`,
                    forestArea: formatArea(scaledStableMha * 1.15, summaryUnit),
                    primaryPercent: `${varyValue(9.0, 26, 0.3).toFixed(1)}%`,
                    primaryArea: formatArea(scaledStableMha * 0.3, summaryUnit),
                    plantedArea: formatArea(varyValue(290 / divisor, 27), unit),
                    otherArea: formatArea(varyValue(2.7 / divisor, 28), summaryUnit),
                    nonForestArea: formatArea(scaledAreaMha * (1 - (forestPct+3)/100), summaryUnit),
                    grad: base.landCover.fao.grad
                }
            },
            forestChange: {
                naturalLoss: {
                    years: "2021 to 2024",
                    naturalPercent: `${Math.round(varyValue(88, 29, 0.1))}%`,
                    totalLoss: formatArea(varyValue(95 / divisor, 30), unit).replace(/\s+/g, ''),
                    co2: formatCO2(varyValue(36 / divisor, 31), co2Unit),
                    chart: [
                        { year: 2021, val: varyValue(26 / divisor, 32, 0.1) },
                        { year: 2022, val: varyValue(24 / divisor, 33, 0.1) },
                        { year: 2023, val: varyValue(28 / divisor, 34, 0.1) },
                        { year: 2024, val: varyValue(30 / divisor, 35, 0.1) }
                    ]
                },
                lossRankings: {
                    years: "2001 to 2024",
                    topRegion: regionName,
                    lossArea: formatArea(scaledAnnualLossMha * 0.25, unit),
                    baseYear: 2000,
                    basePercent: `${Math.round(varyValue(12, 36, 0.2))}%`,
                    rankings: []
                },
                deforestationRankings: {
                    years: "2015 to 2020",
                    rate: rType === 'sub-region' ? `${Math.round(varyValue(650 / divisor * 1000, 37))} ha/year` : `${varyValue(7.5 / divisor, 37).toFixed(1)} ${unit}/year`,
                    rankings: []
                },
                gainRankings: {
                    years: "2000 to 2020",
                    totalGain: formatArea(scaledGainMha, unit),
                    rankings: []
                },
                reforestationRankings: {
                    years: "15 to 20",
                    globalRate: rType === 'sub-region' ? `${Math.round(varyValue(500 / divisor * 1000, 38))} ha/yr` : `${varyValue(5.5 / divisor, 38).toFixed(1)} ${unit}/yr`,
                    rankings: []
                },
                gainOutside: {
                    years: "2000 to 2020",
                    outsidePercent: `${Math.round(varyValue(86, 39, 0.1))}%`,
                    outsideArea: formatArea(scaledGainMha * 0.86, unit),
                    withinArea: formatArea(scaledGainMha * 0.14, unit),
                    grad: base.forestChange.gainOutside.grad
                }
            },
            climate: {
                fluxes: {
                    years: "2001 to 2024",
                    emitted: formatCO2(varyValue(9.2 / divisor, 40), co2Unit),
                    removed: `-${formatCO2(varyValue(14 / divisor, 41), co2Unit)}`,
                    net: `-${formatCO2(varyValue(5.3 / divisor, 42), co2Unit)}`,
                    type: base.climate.fluxes.type,
                    bars: {
                        removed: varyValue(14 / divisor, 43, 0.1),
                        emitted: varyValue(9.2 / divisor, 44, 0.1),
                        netRemovals: varyValue(5.3 / divisor, 45, 0.1)
                    }
                },
                drivers: {
                    years: "2001 to 2024",
                    avg: formatCO2(varyValue(3.8 / divisor, 46), co2Unit),
                    items: {
                        commodities: formatCO2(varyValue(0.098 / divisor, 47), co2Unit),
                        agriculture: formatCO2(varyValue(3.6 / divisor, 48), co2Unit),
                        infrastructure: formatCO2(varyValue(0.077 / divisor, 49), co2Unit),
                        logging: formatCO2(varyValue(2.4 / divisor, 50), co2Unit),
                        natural: formatCO2(varyValue(0.120 / divisor, 51), co2Unit),
                        wildfire: formatCO2(varyValue(1.6 / divisor, 52), co2Unit),
                        shifting: formatCO2(varyValue(1.2 / divisor, 53), co2Unit)
                    },
                    grad: base.climate.drivers.grad
                },
                biomass: {
                    topPercent: `${Math.round(varyValue(49, 54, 0.2))}%`,
                    rankings: []
                },
                soilCarbon: {
                    topPercent: `${Math.round(varyValue(55, 55, 0.2))}%`,
                    rankings: []
                }
            }
        };
    };

    // Dynamic helper to get current metrics - Prioritize API data, fallback to mock
    const getRegionData = () => {
        const mock = generateDynamicRegionData(selectedRegion);
        let finalData = { ...mock };

        if (regionData && regionData.isRealData) {
            finalData = {
                ...finalData,
                ...regionData,
                summary: { ...finalData.summary, ...regionData.summary },
                annualLoss: { ...finalData.annualLoss, ...regionData.annualLoss },
                primaryLoss: { ...finalData.primaryLoss, ...regionData.primaryLoss }
            };
        } else if (regionData) {
            finalData = {
                ...finalData,
                summary: { ...finalData.summary, ...(regionData.summary || {}) },
                primaryLoss: {
                    ...finalData.primaryLoss,
                    total: regionData.primaryForestLoss ? `${regionData.primaryForestLoss} Mha` : finalData.primaryLoss.total
                },
                annualLoss: {
                    ...finalData.annualLoss,
                    total: regionData.treeCoverLoss ? `${regionData.treeCoverLoss} Mha` : finalData.annualLoss.total
                }
            };
        }

        // Dynamic ranking logic
        let peers = [];
        let rankingType = 'provinces';

        if (selectedRegion === 'Pakistan') {
            peers = pakistanRegions.map(p => p.name);
            rankingType = 'provinces';
        } else if (citySubRegions[selectedRegion]) {
            // It's a city
            peers = citySubRegions[selectedRegion];
            rankingType = 'sub-regions';
        } else {
            // Check if it's a sub-region
            for (const [city, subRegions] of Object.entries(citySubRegions)) {
                if (subRegions.includes(selectedRegion)) {
                    peers = subRegions.filter(s => s !== selectedRegion);
                    rankingType = 'peers';
                    break;
                }
            }
        }

        if (peers.length > 0) {
            // Helper to generate dynamic rankings with varied units
            const generateRankings = (unit, scale = 1, baseValue = 0.8) => {
                return peers.slice(0, 5).map((name, index) => ({
                    rank: index + 1,
                    name: name,
                    value: `${((baseValue - index * (baseValue / 8)) * scale).toFixed(1)} ${unit}`
                }));
            };

            let rRankUnit = 'Gha';
            let rLossUnit = 'Mha';
            let rDeforUnit = 'kha/year';
            let rGainUnit = 'Mha';
            let rRefoUnit = 'kha/yr';
            let rBiomassUnit = 'Gt';
            let rSoilUnit = 'Gt';

            let rankBaseLC = 1.2;
            let rankBaseLoss = 12;
            let rankBaseDefor = 650;
            let rankBaseGain = 14;
            let rankBaseRefo = 500;
            let rankBaseBiomass = 62;
            let rankBaseSoil = 55;

            const rType = getRegionType(selectedRegion);
            if (rType === 'city') {
                rRankUnit = 'Kha';
                rLossUnit = 'ha';
                rDeforUnit = 'ha/year';
                rGainUnit = 'ha';
                rRefoUnit = 'ha/yr';
                rBiomassUnit = 'Kt';
                rSoilUnit = 'Kt';

                rankBaseLC = 15;
                rankBaseLoss = 180;
                rankBaseDefor = 45;
                rankBaseGain = 120;
                rankBaseRefo = 30;
                rankBaseBiomass = 450;
                rankBaseSoil = 380;
            } else if (rType === 'sub-region') {
                rRankUnit = 'ha';
                rLossUnit = 'ha';
                rDeforUnit = 'ha/year';
                rGainUnit = 'ha';
                rRefoUnit = 'ha/yr';
                rBiomassUnit = 'Kt';
                rSoilUnit = 'Kt';

                rankBaseLC = 800;
                rankBaseLoss = 25;
                rankBaseDefor = 8;
                rankBaseGain = 15;
                rankBaseRefo = 5;
                rankBaseBiomass = 80;
                rankBaseSoil = 60;
            }

            // Land Cover
            const lcRankings = generateRankings(rRankUnit, 1, rankBaseLC);
            finalData.landCover = {
                ...finalData.landCover,
                location: {
                    ...finalData.landCover.location,
                    topCount: lcRankings.length,
                    topRegion: peers[0],
                    topArea: lcRankings[0].value,
                    avgArea: `${(rankBaseLC / 2).toFixed(1)} ${rRankUnit}`,
                    rankings: lcRankings
                }
            };

            // Forest Change
            const lossRankings = generateRankings(rLossUnit, 1, rankBaseLoss);
            const deforRankings = generateRankings(rDeforUnit, 1, rankBaseDefor);
            const gainRankings = generateRankings(rGainUnit, 1, rankBaseGain);
            const refoRankings = generateRankings(rRefoUnit, 1, rankBaseRefo);

            finalData.forestChange = {
                ...finalData.forestChange,
                lossRankings: {
                    ...finalData.forestChange.lossRankings,
                    topRegion: peers[0],
                    lossArea: lossRankings[0].value,
                    rankings: lossRankings
                },
                deforestationRankings: {
                    ...finalData.forestChange.deforestationRankings,
                    rate: deforRankings[0].value,
                    rankings: deforRankings
                },
                gainRankings: {
                    ...finalData.forestChange.gainRankings,
                    totalGain: gainRankings[0].value,
                    rankings: gainRankings
                },
                reforestationRankings: {
                    ...finalData.forestChange.reforestationRankings,
                    globalRate: refoRankings[0].value,
                    rankings: refoRankings
                }
            };

            // Climate
            const biomassRankings = generateRankings(rBiomassUnit, 1, rankBaseBiomass);
            const soilRankings = generateRankings(rSoilUnit, 1, rankBaseSoil);

            finalData.climate = {
                ...finalData.climate,
                biomass: {
                    ...finalData.climate.biomass,
                    rankings: biomassRankings
                },
                soilCarbon: {
                    ...finalData.climate.soilCarbon,
                    rankings: soilRankings
                }
            };
        }

        return finalData;
    }
    const data = getRegionData()

    // Dynamic chart units and scaling helpers
    const getChartUnit = (totalStr) => {
        if (!totalStr) return { maxUnit: 'Mha', valUnit: 'M', factor: 1 };
        if (totalStr.includes('Gha')) return { maxUnit: 'Gha', valUnit: 'G', factor: 0.001 };
        if (totalStr.includes('Kha')) return { maxUnit: 'Kha', valUnit: 'K', factor: 10 };
        if (totalStr.includes('ha')) return { maxUnit: 'ha', valUnit: '', factor: 10000 };
        return { maxUnit: 'Mha', valUnit: 'M', factor: 1 };
    };

    const getFluxUnit = (co2Str) => {
        if (!co2Str) return { maxUnit: 'Gt', factor: 1 };
        if (co2Str.includes('Gt')) return { maxUnit: 'Gt', factor: 1 };
        if (co2Str.includes('Mt')) return { maxUnit: 'Mt', factor: 1000 };
        if (co2Str.includes('Kt')) return { maxUnit: 'Kt', factor: 1000000 };
        return { maxUnit: 'Gt', factor: 1 };
    };

    const formatTick = (val, unitObj) => {
        const scaled = val * (unitObj.factor || 1);
        if (scaled === 0) return '0';
        if (scaled >= 1) return scaled.toFixed(1);
        if (scaled >= 0.1) return scaled.toFixed(2);
        return scaled.toFixed(3);
    };

    const pUnit = getChartUnit(data.primaryLoss?.total);
    const aUnit = getChartUnit(data.annualLoss?.total);
    const nUnit = getChartUnit(data.forestChange?.naturalLoss?.totalLoss);
    const cUnit = getFluxUnit(data.climate?.fluxes?.emitted);

    const fUnit = data.climate?.fluxes?.emitted?.replace(/[0-9.\-\s]/g, '') || 'Gt';
    const maxFlux = data.climate?.fluxes?.bars ? Math.max(
        data.climate.fluxes.bars.removed || 1,
        data.climate.fluxes.bars.emitted || 1,
        data.climate.fluxes.bars.netRemovals || 1
    ) : 20;
    const fluxScaleVal = maxFlux * 1.3;

    // Risk monitoring is now handled globally by RiskMonitor component

    // Data for region positions on the map [lat, lng, zoom]
    // Use centralized coordinates
    const regionPositions = regionCoordinates;

    // Component to synchronize map view with selected region
    function DashboardMapEffect({ region }) {
        const map = useMap()
        React.useEffect(() => {
            if (region && regionPositions[region]) {
                const [lat, lng, zoom] = regionPositions[region]
                map.flyTo([lat, lng], zoom)
            }
        }, [region, map])
        return null
    }

    const tabs = ['SUMMARY', 'LAND COVER', 'FOREST CHANGE', 'CLIMATE']
    // We will translate these when rendering: t('dashboard.' + tab.toLowerCase().replace(' ', '')) or similar map,
    // OR just use keys directly in state if we want.
    // Better: Keep English keys for logic, translate for display.
    const tabDisplayNames = {
        'SUMMARY': 'dashboard.summary',
        'LAND COVER': 'dashboard.landCover',
        'FOREST CHANGE': 'dashboard.forestChange',
        'CLIMATE': 'dashboard.climate'
    }


    // Forest data markers
    const forestData = [
        { lat: 30.3753, lng: 69.3451, type: 'primary', name: 'Pakistan Region 1' },
        { lat: 34.0151, lng: 71.5249, type: 'primary', name: 'Khyber Pakhtunkhwa' },
        { lat: 31.5204, lng: 74.3587, type: 'loss', name: 'Punjab Area' },
        { lat: 24.8607, lng: 67.0011, type: 'loss', name: 'Sindh Area' },
        { lat: -3.4653, lng: -62.2159, type: 'primary', name: 'Amazon' },
        { lat: 64.9631, lng: 19.0205, type: 'loss', name: 'Scandinavia' },
        { lat: 20.0, lng: 0.0, type: 'primary', name: 'Center' }
    ]

    return (
        <div className="dashboard-page">
            {isLoading && (
                <div className="loading-overlay" style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div className="loading-spinner" style={{
                        width: '50px', height: '50px', border: '4px solid #10b981',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <div style={{ marginTop: '16px', fontWeight: 'bold', color: '#065f46' }}>
                        Fetching Forest Metrics...
                    </div>
                </div>
            )}
            <Header className="map-header" />

            <div className="dashboard-content">
                {/* Left Panel */}
                <div className="dashboard-left">
                    <div className="dashboard-header-light">
                        <div className="dashboard-title-row">
                            <div>
                                <h1 className="dashboard-title-main">{t('dashboard.region.pakistan')}</h1>
                                <div
                                    className="country-selector"
                                    onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="country-selector-text">{selectedRegion}</span>
                                        <span className="dropdown-arrow-small">▼</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSaveArea();
                                            }}
                                            style={{
                                                marginLeft: '12px',
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: '#10b981',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'}
                                        >
                                            + {t('profile.saveArea')}
                                        </button>
                                    </div>

                                    {isRegionDropdownOpen && (
                                        <div className="region-dropdown" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {pakistanRegions.map((prov) => (
                                                <React.Fragment key={prov.name}>
                                                    {prov.zones.map(zone => (
                                                        <React.Fragment key={zone.name}>
                                                            {/* Removed zone header per user request */}
                                                            {zone.locations.map(loc => (
                                                                <div
                                                                    key={loc}
                                                                    className={`region-option district ${selectedRegion === loc ? 'active' : ''}`}
                                                                    style={{ paddingLeft: '24px' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSelectedRegion(loc)
                                                                        setIsRegionDropdownOpen(false)
                                                                    }}
                                                                >
                                                                    {loc}
                                                                </div>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="dashboard-actions">
                                <button className="map-control-btn dashboard-share-main" onClick={() => handleShare()} aria-label="Share" style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#97bd3d',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}>
                                    <ShareIcon />
                                </button>
                                <button className="dashboard-action-btn primary" onClick={handleDownload}>{t('DOWNLOAD') || 'DOWNLOAD'}</button>
                            </div>
                        </div>
                        <p className="dashboard-summary-text">
                            In {data.summary.year}, <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> had <strong>{data.summary.area}</strong> of natural forest, extending over <strong>{data.summary.percent}</strong> of its land area. In 2024, it lost <strong>{data.summary.loss}</strong> of natural forest, equivalent to <strong>{data.summary.co2}</strong> of CO₂ emissions.

                        </p>
                    </div>

                    <div className="dashboard-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                className={`dashboard-tab ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {t(tabDisplayNames[tab])}
                            </button>
                        ))}
                    </div>

                    <div className="dashboard-body">
                        {activeTab === 'SUMMARY' && (
                            <>
                                <div className="dashboard-intro-text">
                                    Explore interactive charts and maps that summarize key forest statistics <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>. Learn about forest extent, rates of change, and drivers of deforestation – all of which can be customized, shared, and downloaded.
                                </div>

                                {/* NEW: RISK ANALYSIS CARD */}
                                {mlData && (
                                    <div className="forest-loss-card" style={{
                                        borderTopColor: mlData.risk_score > 0.5 ? '#f43f5e' : '#10b981',
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                        borderRadius: '16px',
                                        marginBottom: '20px'
                                    }}>
                                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                                            DEFORESTATION RISK ANALYSIS FOR {selectedRegion.toUpperCase()}
                                        </div>

                                        <div className="risk-box" style={{
                                            padding: '24px',
                                            backgroundColor: '#fff1f2',
                                            border: '1px solid #fecdd3',
                                            borderRadius: '12px',
                                            marginTop: '16px',
                                            animation: 'fadeIn 0.4s ease-out'
                                        }}>
                                            <h5 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '18px' }}>⚠️</span> Deforestation Risk Assessment
                                            </h5>

                                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                                {/* Mini-Cards for Risk & Confidence */}
                                                <div style={{
                                                    flex: 1,
                                                    minWidth: '150px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                    padding: '16px',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(255, 255, 255, 0.5)'
                                                }}>
                                                    <div style={{ fontSize: '10px', color: '#881337', fontWeight: '800', textTransform: 'uppercase' }}>Risk Score</div>
                                                    <div style={{ fontSize: '32px', fontWeight: '800', color: mlData.risk_score > 0.5 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                                                        {(mlData.risk_score * 100).toFixed(0)}<span style={{ fontSize: '14px', color: '#94a3b8' }}>/100</span>
                                                    </div>
                                                </div>

                                                <div style={{
                                                    flex: 1,
                                                    minWidth: '150px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                    padding: '16px',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(255, 255, 255, 0.5)'
                                                }}>
                                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Confidence</div>
                                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
                                                        {(mlData.confidence * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '13px', color: '#881337', lineHeight: '1.5', padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                {mlData.risk_score > thresholds.high ? 'High risk detected. Immediate conservation recommended.' : (mlData.risk_score > thresholds.medium ? 'Moderate risk. Continue monitoring.' : 'Low risk.')}
                                            </div>

                                            {/* Opacity Slider - Now Functional for Dashboard Risk Layer */}
                                            <div style={{ marginTop: '20px', borderTop: '1px dashed #fecdd3', paddingTop: '12px' }}>
                                                <label style={{ fontSize: '11px', color: '#881337', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span>MAP LAYER INTENSITY</span>
                                                    <span>{(riskOpacity * 100).toFixed(0)}%</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1"
                                                    step="0.1"
                                                    defaultValue={riskOpacity}
                                                    onChange={(e) => setRiskOpacity(parseFloat(e.target.value))}
                                                    style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: '#e11d48' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Projected Loss Trend Section - Preserved & Styled */}
                                        <div style={{ marginTop: '24px', padding: '0 8px' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.05em' }}>Projected Loss Trend (Next 3 Years)</div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', gap: '20px', padding: '0 10px' }}>
                                                {(mlData.forest_loss_trend || []).map((trend, idx) => (
                                                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                                        <div style={{ fontSize: '10px', color: '#475569', fontWeight: '800', marginBottom: '2px' }}>
                                                            {(trend.risk * 100).toFixed(0)}%
                                                        </div>
                                                        <div style={{
                                                            width: '100%',
                                                            maxWidth: '40px',
                                                            background: trend.risk > 0.6
                                                                ? 'linear-gradient(180deg, #fb7185 0%, #e11d48 100%)'
                                                                : 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                                                            height: `${trend.risk * 80}px`,
                                                            borderRadius: '20px',
                                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                            transition: 'transform 0.3s ease',
                                                            cursor: 'pointer'
                                                        }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scaleY(1.05)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scaleY(1)'}
                                                        ></div>
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{trend.year}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECOND CARD: REFORESTATION RECOMMENDATIONS */}
                                {mlData && (
                                    <div className="forest-loss-card" style={{
                                        borderTopColor: '#10b981',
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                                        borderRadius: '16px'
                                    }}>
                                        <div className="card-title" style={{ color: '#166534' }}>
                                            REFORESTATION STRATEGY
                                        </div>

                                        <div className="recommendations-box" style={{
                                            padding: '20px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '12px',
                                            marginTop: '16px',
                                            animation: 'fadeIn 0.4s ease-out'
                                        }}>
                                            <h5 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '20px' }}>🌱</span> AI Recommended Species
                                            </h5>

                                            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                                                {(mlData.reforestation_recommendations || []).map((recommendation, idx) => (
                                                    <li key={idx} style={{
                                                        marginBottom: '12px',
                                                        padding: '12px',
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '8px',
                                                        border: '1px solid #dcfce7',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#14532d' }}>{recommendation.split(':')[0]}</div>
                                                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px', lineHeight: '1.5' }}>
                                                            {recommendation.includes(':') ? recommendation.split(':')[1] : 'Optimized for local soil and climate conditions.'}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>

                                        </div>
                                    </div>
                                )}

                                <button
                                    className="analysis-action-btn clear"
                                    onClick={() => setIsRiskLayerVisible(!isRiskLayerVisible)}
                                    style={{
                                        marginTop: '20px',
                                        padding: '10px 16px',
                                        fontSize: '13px',
                                        borderRadius: '8px',
                                        width: 'max-content'
                                    }}
                                >
                                    {isRiskLayerVisible ? (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                                                <path d="M3 6h18"></path>
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                            </svg>
                                            {t('dashboard.hideMap')}
                                        </>
                                    ) : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                                                <path d="M22 12s-4 8-11 8-11-8-11-8 4-8 11-8 11 8 11 8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                            {t('dashboard.showMap')}
                                        </>
                                    )}
                                </button>


                                <div className="forest-loss-card">
                                    <div className="card-title">
                                        {selectedRegion.toUpperCase()} {t('dashboard.primaryLoss').toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Primary Forest Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Primary Forest Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        {t('dashboard.from')} <strong>{data.primaryLoss.years}</strong>, {t('dashboard.thereWas')} <strong>{data.primaryLoss.total}</strong> {t('dashboard.humidPrimaryLost')} <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong>, {t('dashboard.makingUp')} <strong>{data.primaryLoss.percent}</strong> {t('dashboard.ofTotalLoss')} {t('dashboard.totalAreaDecreased')} <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> {t('dashboard.by')} <strong>{data.primaryLoss.decrease}</strong> {t('dashboard.inThisPeriod')}
                                    </div>

                                    <div className="forest-loss-chart-container">
                                        {data.primaryLoss.chart && data.primaryLoss.chart.length > 0 ? (
                                            <>
                                                <div className="chart-y-axis">
                                                    <span>{formatTick(Math.max(...data.primaryLoss.chart), pUnit)}{pUnit.maxUnit}</span>
                                                    <span>{formatTick(Math.max(...data.primaryLoss.chart) * 0.75, pUnit)}{pUnit.valUnit}</span>
                                                    <span>{formatTick(Math.max(...data.primaryLoss.chart) * 0.5, pUnit)}{pUnit.valUnit}</span>
                                                    <span>{formatTick(Math.max(...data.primaryLoss.chart) * 0.25, pUnit)}{pUnit.valUnit}</span>
                                                    <span>0</span>
                                                </div>
                                                <div className="chart-main">
                                                    <div className="chart-grid">
                                                        {[1, 2, 3, 4].map(idx => <div key={idx} className="grid-line"></div>)}
                                                    </div>
                                                    <div className="chart-bars">
                                                        {data.primaryLoss.chart.map((val, i) => (
                                                            <div key={i} className="chart-bar-wrapper">
                                                                <div className="chart-bar" style={{ height: `${(val / Math.max(...data.primaryLoss.chart)) * 100}%` }}></div>
                                                                <span className="bar-label">{i + 2 < 10 ? `0${i + 2}` : (i + 2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="chart-y-axis right">
                                                    <span>100%</span>
                                                    <span>75</span>
                                                    <span>50</span>
                                                    <span>25</span>
                                                    <span>0</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', padding: '40px 0' }}>
                                                Historical primary loss chart data unavailable for {selectedRegion}
                                            </div>
                                        )}
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#f091b2', label: 'Primary forest loss' },
                                        { color: '#97bd3d', label: 'Primary forest area extent remaining', shape: 'dash' }
                                    ]} />
                                </div>

                                {/* Card 2: ANNUAL TREE COVER LOSS */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#97bd3d', marginTop: '40px' }}>
                                    <div className="card-title">
                                        {selectedRegion.toUpperCase()} {t('dashboard.annualLoss').toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Annual Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Annual Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        {t('dashboard.from')} <strong>{data.annualLoss.years}</strong>, {t('dashboard.thereWas')} <strong>{data.annualLoss.total}</strong> {t('dashboard.treeCoverLoss')} <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong>, {t('dashboard.equivalentTo')} <strong>{data.annualLoss.percent}</strong> {t('dashboard.of2000')} <strong>{data.annualLoss.co2}</strong> {t('dashboard.co2Emissions')}
                                    </div>

                                    <div className="forest-loss-chart-container">
                                        {data.annualLoss.chart && data.annualLoss.chart.length > 0 ? (
                                            <>
                                                <div className="chart-y-axis">
                                                    <span>{formatTick(Math.max(...data.annualLoss.chart), aUnit)}{aUnit.maxUnit}</span>
                                                    <span>{formatTick(Math.max(...data.annualLoss.chart) * 0.75, aUnit)}{aUnit.valUnit}</span>
                                                    <span>{formatTick(Math.max(...data.annualLoss.chart) * 0.5, aUnit)}{aUnit.valUnit}</span>
                                                    <span>{formatTick(Math.max(...data.annualLoss.chart) * 0.25, aUnit)}{aUnit.valUnit}</span>
                                                    <span>0</span>
                                                </div>
                                                <div className="chart-main">
                                                    <div className="chart-grid">
                                                        {[1, 2, 3, 4].map(idx => <div key={idx} className="grid-line"></div>)}
                                                    </div>
                                                    <div className="chart-bars">
                                                        {data.annualLoss.chart.map((val, i) => (
                                                            <div key={i} className="chart-bar-wrapper">
                                                                <div className="chart-bar stacked" style={{ height: `${(val / Math.max(...data.annualLoss.chart)) * 100}%` }}>
                                                                    <div className="bar-segment segment-1"></div>
                                                                    <div className="bar-segment segment-2"></div>
                                                                    <div className="bar-segment segment-3"></div>
                                                                    <div className="bar-segment segment-4"></div>
                                                                </div>
                                                                <span className="bar-label">{(i + 1) < 10 ? `0${i + 1}` : (i + 1)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', padding: '40px 0' }}>
                                                Historical annual loss chart data unavailable for {selectedRegion}
                                            </div>
                                        )}
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#e96d6d', label: 'Commodity driven' },
                                        { color: '#f3ad28', label: 'Permanent agriculture' },
                                        { color: '#5c8a38', label: 'Forestry' },
                                        { color: '#4a48b8', label: 'Other natural' },
                                        { color: '#b57d38', label: 'Wildfire' }
                                    ]} />
                                </div>

                                {/* Card 3: TREE COVER LOSS BY DOMINANT DRIVER */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px' }}>
                                    <div className="card-title">
                                        {selectedRegion.toUpperCase()} {t('dashboard.dominantDriver').toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Dominant Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Dominant Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> {t('dashboard.from')} <strong>{data.annualLoss.years?.includes('to') ? data.annualLoss.years.split(' to ')[0] : 'N/A'}</strong> {t('dashboard.to')} <strong>{data.annualLoss.years?.includes('to') ? data.annualLoss.years.split(' to ')[1] : 'N/A'}</strong>, <strong>{data.drivers.percent}</strong> {t('dashboard.occurredInAreas')} <strong>{t('dashboard.deforestation')}</strong>.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="drivers-right">
                                            <div className="donut-chart-container">
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(#e96d6d 0% 1%, #e59d24 1% 33%, #9b59b6 33% 34%, #48a04b 34% 59%, #34495e 59% 61%, #8d4e2d 61% 90%, #f1c40f 90% 100%)`
                                                }}>
                                                    <div className="donut-hole"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#e96d6d', label: 'Hard commodities', value: data.drivers.commodities },
                                        { color: '#e59d24', label: 'Permanent agriculture', value: data.drivers.agriculture },
                                        { color: '#9b59b6', label: 'Settlements & infrastructure', value: data.drivers.infrastructure },
                                        { color: '#48a04b', label: 'Logging', value: data.drivers.logging },
                                        { color: '#34495e', label: 'Other natural disturbances', value: data.drivers.natural },
                                        { color: '#8d4e2d', label: 'Wildfire', value: data.drivers.wildfire },
                                        { color: '#f1c40f', label: 'Shifting cultivation', value: data.drivers.shifting }
                                    ]} />
                                </div>

                                {/* Card 4: COMPONENTS OF NET CHANGE IN TREE COVER GLOBALLY */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px' }}>
                                    <div className="card-title">
                                        {t('dashboard.netChange').toUpperCase()} IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Net Change')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Net Change')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        From <strong>{data.netChange.years}</strong>, <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> experienced a net change of <strong>{data.netChange.total}</strong> (<strong>{data.netChange.percent}</strong>) in tree cover.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="drivers-right">
                                            <div className="donut-chart-container" style={{ width: '220px', height: '220px' }}>
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(${data.netChange.grad})`
                                                }}>
                                                    <div className="donut-hole"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#7cac44', label: 'Stable forest', value: data.netChange.stable },
                                        { color: '#5c65a0', label: 'Gain', value: data.netChange.gain },
                                        { color: '#a3539b', label: 'Loss', value: data.netChange.loss },
                                        { color: '#f68160', label: 'Disturbed', value: data.netChange.disturbed }
                                    ]} />
                                </div>
                            </>
                        )}

                        {activeTab === 'LAND COVER' && (
                            <>
                                <div className="dashboard-intro-text">
                                    {t('dashboard.intro')} <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>. {t('dashboard.learnAbout')}
                                </div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                    {/* NATURAL FOREST */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} {t('dashboard.naturalForest').toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Natural Forest')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Natural Forest')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            {t('dashboard.asOf')} <strong>{data.landCover.natural.year}</strong>, <strong>{data.landCover.natural.naturalPercent}</strong> {t('dashboard.landCover.was')} <strong>{t('dashboard.landCover.naturalForests')}</strong> {t('dashboard.landCover.and')} <strong>{data.landCover.natural.nonNaturalPercent}</strong> {t('dashboard.landCover.nonNatural')}.
                                        </div>

                                        <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                            <div className="drivers-right">
                                                <div className="donut-chart-container" style={{ width: '200px', height: '200px' }}>
                                                    <div className="donut-chart" style={{
                                                        background: `conic-gradient(${data.landCover.natural.grad})`
                                                    }}>
                                                        <div className="donut-hole"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#2d6a3e', label: 'Natural forest', value: data.landCover.natural.naturalArea },
                                            { color: '#92d0ab', label: 'Non-natural tree cover', value: data.landCover.natural.nonNaturalArea },
                                            { color: '#cccccc', label: 'Other land cover', value: data.landCover.natural.otherArea }
                                        ]} />
                                    </div>

                                    {/* TREE COVER */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} {t('dashboard.treeCoverLoss').toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Tree Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Tree Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            As of <strong>{data.landCover.treeCover.year}</strong>, <strong>{data.landCover.treeCover.treeCoverPercent}</strong> of <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> land cover was <strong>tree cover</strong> with <strong>&gt;30%</strong> canopy density.
                                        </div>

                                        <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                            <div className="drivers-right">
                                                <div className="donut-chart-container" style={{ width: '200px', height: '200px' }}>
                                                    <div className="donut-chart" style={{
                                                        background: `conic-gradient(${data.landCover.treeCover.grad})`
                                                    }}>
                                                        <div className="donut-hole"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#4b611c', label: 'Tree Cover', value: data.landCover.treeCover.treeCoverArea },
                                            { color: '#e2e7a1', label: 'Other Land Cover', value: data.landCover.treeCover.otherArea }
                                        ]} />
                                    </div>
                                </div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                    {/* LOCATION OF TREE COVER */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {t('dashboard.locationOfTreeCover').toUpperCase()} IN {selectedRegion.toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Location of Tree Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Location of Tree Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> as of <strong>{data.landCover.location.year}</strong>, the top <strong>{data.landCover.location.topCount}</strong> {selectedRegion === 'Pakistan' ? 'provinces' : (citySubRegions[selectedRegion] ? 'sub-regions' : 'areas')} represent <strong>{data.landCover.location.topPercent}</strong> of all tree cover. <strong>{data.landCover.location.topRegion}</strong> had the most tree cover at <strong>{data.landCover.location.topArea}</strong> compared to an average of <strong>{data.landCover.location.avgArea}</strong>.
                                        </div>

                                        <div className="ranking-list">
                                            {data.landCover.location.rankings.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle green">{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#10b981', label: 'Tree cover extent' }
                                        ]} />


                                    </div>

                                    {/* INTACT FOREST */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} {t('dashboard.intactForest').toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Intact Forest')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Intact Forest')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            As of <strong>{data.landCover.intact.year}</strong>, <strong>{data.landCover.intact.intactPercent}</strong> of <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> tree cover was <strong>intact forest</strong>.
                                        </div>

                                        <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                            <div className="drivers-right">
                                                <div className="donut-chart-container" style={{ width: '200px', height: '200px' }}>
                                                    <div className="donut-chart" style={{
                                                        background: `conic-gradient(${data.landCover.intact.grad})`
                                                    }}>
                                                        <div className="donut-hole"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#4b611c', label: 'Intact Forest', value: data.landCover.intact.intactArea },
                                            { color: '#97bd3d', label: 'Other Tree Cover', value: data.landCover.intact.otherTreeArea },
                                            { color: '#e2e7a1', label: 'Non-Forest', value: data.landCover.intact.nonForestArea }
                                        ]} />
                                    </div>
                                </div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                    {/* FAO FOREST COVER */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} {t('dashboard.faoForest').toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'FAO Forest Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'FAO Forest Cover')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            According to the FAO, in <strong>{data.landCover.fao.year}</strong>, <strong>{data.landCover.fao.forestPercent}</strong> (<strong>{data.landCover.fao.forestArea}</strong>) of <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> was covered by forest. <strong>{data.landCover.fao.primaryPercent}</strong> of that forest was classified as primary forest.
                                        </div>

                                        <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                            <div className="drivers-right">
                                                <div className="donut-chart-container" style={{ width: '200px', height: '200px' }}>
                                                    <div className="donut-chart" style={{
                                                        background: `conic-gradient(${data.landCover.fao.grad})`
                                                    }}>
                                                        <div className="donut-hole"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#6f9c3f', label: 'Primary Forest', value: data.landCover.fao.primaryArea },
                                            { color: '#9fbf48', label: 'Planted Forest', value: data.landCover.fao.plantedArea },
                                            { color: '#c8d96f', label: 'Other Tree Cover', value: data.landCover.fao.otherArea },
                                            { color: '#eff3c6', label: 'Non-Forest', value: data.landCover.fao.nonForestArea }
                                        ]} />
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'FOREST CHANGE' && (
                            <>
                                <div className="dashboard-intro-text">
                                    Explore interactive charts and maps that summarize the rates of forest change <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>. Statistics – including localized rankings of forest loss and gain – can be customized, shared, and downloaded.
                                </div>

                                <div className="forest-change-buttons">
                                    <button className="fc-btn active" onClick={() => document.getElementById('section-forest-loss')?.scrollIntoView({ behavior: 'smooth' })}>FOREST LOSS</button>
                                    <button className="fc-btn" onClick={() => document.getElementById('section-forest-gain')?.scrollIntoView({ behavior: 'smooth' })}>FOREST GAIN</button>
                                    <button className="fc-btn" onClick={() => document.getElementById('section-net-change')?.scrollIntoView({ behavior: 'smooth' })}>NET FOREST CHANGE</button>
                                </div>

                                <div id="section-forest-loss" className="change-section-label">FOREST LOSS</div>

                                <div className="forest-loss-card highlight-pink">
                                    <div className="card-title">
                                        PRIMARY FOREST LOSS IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Primary Forest Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Primary Forest Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        From <strong>{data.primaryLoss.years?.includes('to') ? data.primaryLoss.years.split(' to ')[0] : 'N/A'}</strong> to <strong>{data.primaryLoss.years?.includes('to') ? data.primaryLoss.years.split(' to ')[1] : 'N/A'}</strong>, there was a total of <strong>{data.primaryLoss.total}</strong> humid primary forest lost <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong>, making up <strong>{data.primaryLoss.percent}</strong> of its total tree cover loss in the same time period. Total area of humid primary forest decreased <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> by <strong>{data.primaryLoss.decrease}</strong> in this time period.
                                    </div>

                                    <div className="forest-loss-chart-container">
                                        <div className="chart-y-axis">
                                            <span>{formatTick(Math.max(...(data.primaryLoss?.chart || [0])), pUnit)}{pUnit.maxUnit}</span>
                                            <span>{formatTick(Math.max(...(data.primaryLoss?.chart || [0])) * 0.75, pUnit)}{pUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.primaryLoss?.chart || [0])) * 0.5, pUnit)}{pUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.primaryLoss?.chart || [0])) * 0.25, pUnit)}{pUnit.valUnit}</span>
                                            <span>0</span>
                                        </div>
                                        <div className="chart-main">
                                            <div className="chart-grid">
                                                {[1, 2, 3, 4].map(idx => <div key={idx} className="grid-line"></div>)}
                                            </div>
                                            <div className="chart-bars">
                                                {data.primaryLoss.chart.map((val, i) => (
                                                    <div key={i} className="chart-bar-wrapper">
                                                        <div className="chart-bar" style={{ height: `${(val / Math.max(...data.primaryLoss.chart)) * 100}%` }}></div>
                                                        <span className="bar-label">{i + 2 < 10 ? `0${i + 2}` : (i + 2 < 25 ? (i + 2) : (i + 2 - 20 < 10 ? `0${i + 2 - 20}` : i + 2 - 20))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="chart-y-axis right">
                                            <span>100%</span>
                                            <span>75</span>
                                            <span>50</span>
                                            <span>25</span>
                                            <span>0</span>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#f091b2', label: 'Primary forest loss' },
                                        { color: '#97bd3d', label: 'Primary forest area extent remaining', shape: 'dash' }
                                    ]} />
                                </div>

                                {/* ANNUAL TREE COVER LOSS */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#97bd3d', marginTop: '40px' }}>
                                    <div className="card-title">
                                        ANNUAL TREE COVER LOSS IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Annual Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Annual Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        From <strong>{data.annualLoss.years.split(' to ')[0]}</strong> to <strong>{data.annualLoss.years.split(' to ')[1]}</strong>, there was a total of <strong>{data.annualLoss.total}</strong> of tree cover loss <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>, equivalent to a <strong>{data.annualLoss.percent}</strong> of the <strong>2000</strong> tree cover area, and <strong>{data.annualLoss.co2}</strong> of CO₂ emissions. This does not account for gains in tree cover over the same period.
                                    </div>

                                    <div className="forest-loss-chart-container">
                                        <div className="chart-y-axis">
                                            <span>{formatTick(Math.max(...(data.annualLoss?.chart || [0])), aUnit)}{aUnit.maxUnit}</span>
                                            <span>{formatTick(Math.max(...(data.annualLoss?.chart || [0])) * 0.75, aUnit)}{aUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.annualLoss?.chart || [0])) * 0.5, aUnit)}{aUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.annualLoss?.chart || [0])) * 0.25, aUnit)}{aUnit.valUnit}</span>
                                            <span>0</span>
                                        </div>
                                        <div className="chart-main">
                                            <div className="chart-grid">
                                                {[1, 2, 3, 4].map(idx => <div key={idx} className="grid-line"></div>)}
                                            </div>
                                            <div className="chart-bars">
                                                {data.annualLoss.chart.map((val, i) => (
                                                    <div key={i} className="chart-bar-wrapper">
                                                        <div className="chart-bar stacked" style={{ height: `${(val / Math.max(...data.annualLoss.chart)) * 100}%` }}>
                                                            <div className="bar-segment segment-1"></div>
                                                            <div className="bar-segment segment-2"></div>
                                                            <div className="bar-segment segment-3"></div>
                                                            <div className="bar-segment segment-4"></div>
                                                        </div>
                                                        <span className="bar-label">{(i + 1) < 10 ? `0${i + 1}` : (i + 1 < 25 ? (i + 1) : (i + 1 - 20 < 10 ? `0${i + 1 - 20}` : i + 1 - 20))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#e96d6d', label: 'Commodity driven' },
                                        { color: '#f3ad28', label: 'Permanent agriculture' },
                                        { color: '#5c8a38', label: 'Forestry' },
                                        { color: '#4a48b8', label: 'Other natural' },
                                        { color: '#b57d38', label: 'Wildfire' }
                                    ]} />
                                </div>

                                {/* Card 3: GLOBAL TREE COVER LOSS BY DOMINANT DRIVER */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px' }}>
                                    <div className="card-title">
                                        {selectedRegion.toUpperCase()} TREE COVER LOSS BY DOMINANT DRIVER
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Dominant Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Dominant Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> from <strong>2001</strong> to <strong>2024</strong>, <strong>{data.drivers.percent}</strong> of tree cover loss occurred in areas where the dominant drivers of loss resulted in <strong>deforestation</strong>.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="drivers-right">
                                            <div className="donut-chart-container">
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(#e96d6d 0% 1%, #e59d24 1% 33%, #9b59b6 33% 34%, #48a04b 34% 59%, #34495e 59% 61%, #8d4e2d 61% 90%, #f1c40f 90% 100%)`
                                                }}>
                                                    <div className="donut-hole"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#e96d6d', label: 'Hard commodities', value: data.drivers.commodities },
                                        { color: '#e59d24', label: 'Permanent agriculture', value: data.drivers.agriculture },
                                        { color: '#9b59b6', label: 'Settlements & infrastructure', value: data.drivers.infrastructure },
                                        { color: '#48a04b', label: 'Logging', value: data.drivers.logging },
                                        { color: '#34495e', label: 'Other natural disturbances', value: data.drivers.natural },
                                        { color: '#8d4e2d', label: 'Wildfire', value: data.drivers.wildfire },
                                        { color: '#f1c40f', label: 'Shifting cultivation', value: data.drivers.shifting }
                                    ]} />
                                </div>

                                {/* Card 4: FOREST LOSS IN NATURAL FOREST */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px' }}>
                                    <div className="card-title">
                                        FOREST LOSS IN NATURAL FOREST IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Natural Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Natural Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        From <strong>{data.forestChange.naturalLoss.years.split(' to ')[0]}</strong> to <strong>{data.forestChange.naturalLoss.years.split(' to ')[1]}</strong>, <strong>{data.forestChange.naturalLoss.naturalPercent}</strong> of tree cover loss <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong> occurred within <strong>natural forest</strong>. The total loss within natural forest was <strong>{data.forestChange.naturalLoss.totalLoss}</strong>, equivalent to <strong>{data.forestChange.naturalLoss.co2}</strong> of CO₂e emissions.
                                    </div>

                                    <div className="forest-loss-chart-container">
                                        <div className="chart-y-axis">
                                            <span>{formatTick(Math.max(...(data.forestChange.naturalLoss.chart.map(c => c.val) || [0])), nUnit)}{nUnit.maxUnit}</span>
                                            <span>{formatTick(Math.max(...(data.forestChange.naturalLoss.chart.map(c => c.val) || [0])) * 0.75, nUnit)}{nUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.forestChange.naturalLoss.chart.map(c => c.val) || [0])) * 0.5, nUnit)}{nUnit.valUnit}</span>
                                            <span>{formatTick(Math.max(...(data.forestChange.naturalLoss.chart.map(c => c.val) || [0])) * 0.25, nUnit)}{nUnit.valUnit}</span>
                                            <span>0</span>
                                        </div>
                                        <div className="chart-main">
                                            <div className="chart-grid">
                                                {[1, 2, 3, 4].map(idx => <div key={idx} className="grid-line"></div>)}
                                            </div>
                                            <div className="chart-bars" style={{ justifyContent: 'space-around', padding: '0 20px' }}>
                                                {data.forestChange.naturalLoss.chart.map((item, i) => (
                                                    <div key={i} className="chart-bar-wrapper" style={{ width: '60px' }}>
                                                        <div className="chart-bar stacked" style={{ height: `${(item.val / Math.max(...data.forestChange.naturalLoss.chart.map(c => c.val))) * 100}%` }}>
                                                            <div className="bar-segment" style={{ flex: 1, backgroundColor: '#f091b2' }}></div>
                                                            <div className="bar-segment" style={{ height: '12%', backgroundColor: '#8c324f' }}></div>
                                                        </div>
                                                        <span className="bar-label">{item.year}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#f091b2', label: 'Natural forest' },
                                        { color: '#8c324f', label: 'Other loss' }
                                    ]} />

                                </div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '40px' }}>
                                    {/* Card 5: GLOBAL TREE COVER LOSS */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} TREE COVER LOSS
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Tree Cover Loss')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            From <strong>{data.forestChange.lossRankings.years.split(' to ')[0]}</strong> to <strong>{data.forestChange.lossRankings.years.split(' to ')[1]}</strong>, <strong>{data.forestChange.lossRankings.topRegion}</strong> had the highest relative tree cover loss <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>, equivalent to a loss of <strong>{data.forestChange.lossRankings.lossArea}</strong>, which represents <strong>{data.forestChange.lossRankings.basePercent}</strong> of the tree cover in the year <strong>{data.forestChange.lossRankings.baseYear}</strong>.
                                        </div>

                                        <div className="ranking-list">
                                            {data.forestChange.lossRankings.rankings.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#f091b2' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#f091b2', label: 'Relative tree cover loss' }
                                        ]} />

                                    </div>

                                    {/* Card 6: GLOBAL FAO DEFORESTATION */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} FAO DEFORESTATION
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'FAO Deforestation')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'FAO Deforestation')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            According to the FAO, the rate of deforestation in <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong> between <strong>{data.forestChange.deforestationRankings.years.split(' to ')[0]}</strong> and <strong>{data.forestChange.deforestationRankings.years.split(' to ')[1]}</strong> was <strong>{data.forestChange.deforestationRankings.rate}</strong> per year.
                                        </div>

                                        <div className="ranking-list">
                                            {data.forestChange.deforestationRankings.rankings.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#f091b2' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#f091b2', label: 'Deforestation rate' }
                                        ]} />

                                    </div>
                                </div>

                                <div id="section-forest-gain" className="change-section-label" style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee' }}>FOREST GAIN</div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
                                    {/* Card 1: GLOBAL TREE COVER GAIN */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            TREE COVER GAIN IN {selectedRegion.toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Tree Cover Gain')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Tree Cover Gain')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            From <strong>{data.forestChange.gainRankings.years.split(' to ')[0]}</strong> to <strong>{data.forestChange.gainRankings.years.split(' to ')[1]}</strong>, <strong>{data.forestChange.gainRankings.totalGain}</strong> of tree cover was gained <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>.
                                        </div>

                                        <div className="ranking-list">
                                            {data.forestChange.gainRankings.rankings.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#5a3fd6' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#5a3fd6', label: 'Tree cover gain' }
                                        ]} />

                                    </div>

                                    {/* Card 2: GLOBAL FAO REFORESTATION */}
                                    <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '0' }}>
                                        <div className="card-title">
                                            {selectedRegion.toUpperCase()} FAO REFORESTATION
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'FAO Reforestation')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'FAO Reforestation')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            According to the FAO, the rate of reforestation <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong> between <strong>{data.forestChange.reforestationRankings.years.split(' to ')[0]}</strong> and <strong>{data.forestChange.reforestationRankings.years.split(' to ')[1]}</strong> was <strong>{data.forestChange.reforestationRankings.globalRate}</strong> per year.
                                        </div>

                                        <div className="ranking-list">
                                            {data.forestChange.reforestationRankings.rankings.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#5a3fd6' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#5a3fd6', label: 'Reforestation rate' }
                                        ]} />

                                    </div>
                                </div>

                                {/* Card 3: TREE COVER GAIN OUTSIDE PLANTATIONS IN {selectedRegion.toUpperCase()} */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px', maxWidth: '600px' }}>
                                    <div className="card-title">
                                        TREE COVER GAIN OUTSIDE PLANTATIONS IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Gain Outside Plantations')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Gain Outside Plantations')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        <strong>{selectedRegion === 'Pakistan' ? `In ${t('dashboard.region.pakistan')}` : `In ${selectedRegion}`}</strong> between <strong>{data.forestChange.gainOutside.years.split(' to ')[0]}</strong> and <strong>{data.forestChange.gainOutside.years.split(' to ')[1]}</strong>, <strong>{data.forestChange.gainOutside.outsidePercent}</strong> of tree cover gain occurred outside of plantations.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="drivers-right">
                                            <div className="donut-chart-container" style={{ width: '180px', height: '180px' }}>
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(${data.forestChange.gainOutside.grad})`
                                                }}>
                                                    <div className="donut-hole"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#5a3fd6', label: 'Tree cover gain outside plantations', value: data.forestChange.gainOutside.outsideArea },
                                        { color: '#bcaafc', label: 'Tree cover gain within plantations', value: data.forestChange.gainOutside.withinArea || '0 Mha' }
                                    ]} />
                                </div>

                                <div id="section-net-change" className="change-section-label" style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee' }}>NET FOREST CHANGE</div>

                                {/* Card: COMPONENTS OF NET CHANGE IN TREE COVER IN {selectedRegion.toUpperCase()} */}
                                <div className="forest-loss-card" style={{ borderTopColor: '#f7f7f7', marginTop: '40px' }}>
                                    <div className="card-title">
                                        COMPONENTS OF NET CHANGE IN TREE COVER IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'Net Change Components')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'Net Change Components')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        From <strong>{data.netChange.years.split(' to ')[0]}</strong> to <strong>{data.netChange.years.split(' to ')[1]}</strong>, <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong> experienced a net change of <strong>{data.netChange.total}</strong> (<strong>{data.netChange.percent}</strong>) in tree cover.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
                                        <div className="drivers-right">
                                            <div className="donut-chart-container" style={{ width: '250px', height: '250px' }}>
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(${data.netChange.grad})`
                                                }}>
                                                    <div className="donut-hole" style={{ width: '50%', height: '50%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#8bb43d', label: 'Stable forest', value: data.netChange.stable },
                                        { color: '#6971c9', label: 'Gain', value: data.netChange.gain },
                                        { color: '#a660a1', label: 'Loss', value: data.netChange.loss },
                                        { color: '#fe815f', label: 'Disturbed', value: data.netChange.disturbed }
                                    ]} />

                                </div>
                            </>
                        )}

                        {activeTab === 'CLIMATE' && (
                            <>
                                <div className="dashboard-intro-text">
                                    Explore interactive charts and maps that summarize the impact of climate <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong>'s forests. Learn about biomass, carbon storage, and greenhouse gas emissions.
                                </div>

                                <div className="forest-loss-card highlight-blue" style={{ borderTop: '3px solid #337a9e' }}>
                                    <div className="card-title">
                                        FOREST-RELATED GREENHOUSE GAS FLUXES IN {selectedRegion.toUpperCase()}
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'GHG Fluxes')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'GHG Fluxes')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        Between <strong>{data.climate?.fluxes?.years?.split(' to ')[0] || '2001'}</strong> and <strong>{data.climate?.fluxes?.years?.split(' to ')[1] || '2023'}</strong>, <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong> forests emitted <strong>{data.climate?.fluxes?.emitted}</strong> of CO₂e/year, and removed <strong>{data.climate?.fluxes?.removed}</strong> of CO₂e/year. This represents a <strong>{data.climate?.fluxes?.type}</strong> of <strong>{data.climate?.fluxes?.net}</strong> of CO₂e/year.
                                    </div>

                                    <div className="climate-chart-container" style={{ marginTop: '40px', padding: '20px 0', minHeight: '350px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '0 50px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#555', marginBottom: '5px' }}>CO₂ absorbed</div>
                                                <div style={{ fontSize: '30px' }}>🍃</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#555', marginBottom: '5px' }}>CO₂ released</div>
                                                <div style={{ fontSize: '30px' }}>🪵</div>
                                            </div>
                                        </div>

                                        <div style={{ position: 'relative', height: '250px', margin: '0 20px' }}>
                                            {/* Center Line */}
                                            <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '30px', width: '1px', backgroundColor: '#333', zIndex: 1 }}></div>

                                            {/* Labels */}
                                            <span style={{ position: 'absolute', top: '40px', left: '25px', fontSize: '11px', fontWeight: 'bold' }}>REMOVALS</span>
                                            <span style={{ position: 'absolute', top: '40px', right: '35px', fontSize: '11px', fontWeight: 'bold' }}>EMISSIONS</span>

                                            {/* Removals Bar (Green, Left) */}
                                            <div style={{ position: 'absolute', top: '20px', right: '50%', width: `${(data.climate.fluxes.bars.removed / fluxScaleVal) * 50}%`, height: '60px', backgroundColor: '#5c8a38', display: 'flex', alignItems: 'center' }}>
                                            </div>

                                            {/* Emissions Bar (Brown, Right) */}
                                            <div style={{ position: 'absolute', top: '20px', left: '50%', width: `${(data.climate.fluxes.bars.emitted / fluxScaleVal) * 50}%`, height: '60px', backgroundColor: '#8b2e2e', display: 'flex', alignItems: 'center' }}>
                                            </div>

                                            {/* Net Removals Bar (Yellow, Left/Right depends on type) */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '90px',
                                                right: data.climate.fluxes.type.includes('sink') ? '50%' : 'auto',
                                                left: data.climate.fluxes.type.includes('source') ? '50%' : 'auto',
                                                width: `${(data.climate.fluxes.bars.netRemovals / fluxScaleVal) * 50}%`,
                                                height: '60px',
                                                backgroundColor: '#c8d96f',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: data.climate.fluxes.type.includes('sink') ? 'flex-start' : 'flex-end'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: data.climate.fluxes.type.includes('sink') ? '0' : 'auto',
                                                    right: data.climate.fluxes.type.includes('source') ? '0' : 'auto',
                                                    transform: data.climate.fluxes.type.includes('sink') ? 'translateX(-110%)' : 'translateX(110%)',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}>{data.climate.fluxes.type.toUpperCase()}</span>
                                            </div>

                                            {/* Horizontal Axis */}
                                            <div style={{ position: 'absolute', bottom: '25px', left: '0', right: '0', height: '1px', backgroundColor: '#ccc' }}></div>

                                            <div style={{ position: 'absolute', bottom: '0', width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#777' }}>
                                                <span style={{ flex: 1, textAlign: 'center' }}>-{formatTick(fluxScaleVal, cUnit)}{cUnit.maxUnit}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>-{formatTick(fluxScaleVal * 0.75, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>-{formatTick(fluxScaleVal * 0.5, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>-{formatTick(fluxScaleVal * 0.25, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>0.0</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>{formatTick(fluxScaleVal * 0.25, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>{formatTick(fluxScaleVal * 0.5, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>{formatTick(fluxScaleVal * 0.75, cUnit)}</span>
                                                <span style={{ flex: 1, textAlign: 'center' }}>{formatTick(fluxScaleVal, cUnit)}{cUnit.maxUnit}</span>
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '-20px', width: '100%', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                                                {fUnit}CO₂e/year
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#5c8a38', label: 'Removals' },
                                        { color: '#8b2e2e', label: 'Emissions' },
                                        { color: '#c8d96f', label: 'Net Flux' }
                                    ]} />

                                </div>

                                <div className="forest-loss-card" style={{ marginTop: '40px' }}>
                                    <div className="card-title">
                                        FOREST-RELATED GREENHOUSE GAS EMISSIONS IN {selectedRegion.toUpperCase()} BY DOMINANT DRIVER
                                        <div className="card-icons">
                                            <span title="Download" onClick={() => handleCardAction('Download', 'GHG Emissions by Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                            <span title="Share" onClick={() => handleCardAction('Share', 'GHG Emissions by Driver')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                        </div>
                                    </div>
                                    <div className="card-content-text">
                                        <strong>{selectedRegion === 'Pakistan' ? `in ${t('dashboard.region.pakistan')}` : `in ${selectedRegion}`}</strong> from <strong>{data.climate?.drivers?.years?.split(' to ')[0] || '2001'}</strong> to <strong>{data.climate?.drivers?.years?.split(' to ')[1] || '2023'}</strong>, an average of <strong>{data.climate?.drivers?.avg}</strong> per year occurred in areas where the dominant drivers of loss resulted in deforestation.
                                    </div>

                                    <div className="drivers-container" style={{ flexDirection: 'column', alignItems: 'center', marginTop: '30px' }}>
                                        <div className="drivers-right" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                            <div className="donut-chart-container" style={{ width: '220px', height: '220px' }}>
                                                <div className="donut-chart" style={{
                                                    background: `conic-gradient(${data.climate.drivers.grad})`
                                                }}>
                                                    <div className="donut-hole" style={{ width: '50%', height: '50%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DynamicLegend items={[
                                        { color: '#e96d6d', label: 'Hard commodities', value: data.climate.drivers.items.commodities },
                                        { color: '#f3ad28', label: 'Permanent agriculture', value: data.climate.drivers.items.agriculture },
                                        { color: '#a660a1', label: 'Settlements & Infrastructure', value: data.climate.drivers.items.infrastructure },
                                        { color: '#5c8a38', label: 'Logging', value: data.climate.drivers.items.logging },
                                        { color: '#e3d234', label: 'Shifting cultivation', value: data.climate.drivers.items.shifting },
                                        { color: '#4a48b8', label: 'Other natural disturbances', value: data.climate.drivers.items.natural },
                                        { color: '#b57d38', label: 'Wildfire', value: data.climate.drivers.items.wildfire }
                                    ]} />
                                </div>

                                <div className="land-cover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
                                    {/* ABOVEGROUND LIVE WOODY BIOMASS IN {selectedRegion.toUpperCase()} */}
                                    <div className="forest-loss-card" style={{ marginTop: '0' }}>
                                        <div className="card-title">
                                            ABOVEGROUND LIVE WOODY BIOMASS IN {selectedRegion.toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Biomass')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Biomass')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            Around <strong>{data.climate.biomass.topPercent}</strong> of <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong>’s <strong>total biomass</strong> is contained in the top <strong>{data.climate.biomass.rankings.length}</strong> {selectedRegion === 'Pakistan' ? 'provinces' : (citySubRegions[selectedRegion] ? 'sub-regions' : 'areas')}.
                                        </div>

                                        <div className="ranking-list">
                                            {data.climate?.biomass?.rankings?.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#8b5a2b' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#8b5a2b', label: 'Live woody biomass density' }
                                        ]} />
                                    </div>

                                    {/* SOIL ORGANIC CARBON IN {selectedRegion.toUpperCase()} */}
                                    <div className="forest-loss-card" style={{ marginTop: '0' }}>
                                        <div className="card-title">
                                            SOIL ORGANIC CARBON IN {selectedRegion.toUpperCase()}
                                            <div className="card-icons">
                                                <span title="Download" onClick={() => handleCardAction('Download', 'Soil Organic Carbon')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}>⬇️</span>
                                                <span title="Share" onClick={() => handleCardAction('Share', 'Soil Organic Carbon')} style={{ backgroundColor: '#97bd3d', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}><ShareIcon /></span>
                                            </div>
                                        </div>
                                        <div className="card-content-text">
                                            Around <strong>{data.climate.soilCarbon.topPercent}</strong> of <strong>{selectedRegion === 'Pakistan' ? t('dashboard.region.pakistan') : selectedRegion}</strong>’s <strong>total carbon storage</strong> is contained in the top <strong>{data.climate.soilCarbon.rankings.length}</strong> {selectedRegion === 'Pakistan' ? 'provinces' : (citySubRegions[selectedRegion] ? 'sub-regions' : 'areas')}.
                                        </div>

                                        <div className="ranking-list">
                                            {data.climate?.soilCarbon?.rankings?.map((item) => (
                                                <div key={item.rank} className="ranking-item">
                                                    <div className="rank-name-group">
                                                        <span className="rank-circle" style={{ backgroundColor: '#8b5a2b' }}>{item.rank}</span>
                                                        <span className="rank-name">{item.name}</span>
                                                    </div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <DynamicLegend items={[
                                            { color: '#8b5a2b', label: 'Soil organic carbon density' }
                                        ]} />

                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel - Map */}
                <div className="dashboard-right">
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        className="dashboard-map-container"
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {/* Deforestation Risk Zones - Managed via Dashboard state */}
                        <RiskZoneLayer
                            region={selectedRegion}
                            isVisible={isRiskLayerVisible}
                            opacity={riskOpacity}
                            zones={mlData?.zones}
                            regionPolygon={mlData?.geometry}
                        />

                        {/* Highlighted Region Marker REMOVED to match Map page style */}

                        {/* Custom Controls inside MapContainer */}
                        <DashboardMapControls />
                        <DashboardMapEffect region={selectedRegion} />

                    </MapContainer>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default Dashboard
