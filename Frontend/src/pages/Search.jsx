import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { mlService } from '../services/mlService'

function Search() {
    const { t } = useTranslation()
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [analysisResult, setAnalysisResult] = useState(null)
    const [hasSearched, setHasSearched] = useState(false)

    const handleSearch = async (e) => {
        if (e) e.preventDefault()
        if (!searchQuery.trim()) return

        setIsLoading(true)
        setError(null)
        setAnalysisResult(null)
        setHasSearched(true)

        try {
            const data = await mlService.fetchLatestAnalysis(searchQuery)
            setAnalysisResult(data)
        } catch (err) {
            console.error('Search failed:', err)
            setError(t('profile.updateError'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="search-page">
            <Header className="map-header" />

            <div className="search-content" style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '60px' }}>
                <div className="search-main container" style={{ maxWidth: '800px', margin: '0 auto' }}>

                    {/* Search Bar Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <form onSubmit={handleSearch} className="search-form">
                            <div className="search-input-wrapper" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder={t('search.placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ padding: '20px 24px', fontSize: '16px' }}
                                />
                                <button type="submit" className="search-submit-btn" aria-label={t('header.search')} disabled={isLoading}>
                                    {isLoading ? (
                                        <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Results Section */}
                    <div className="search-results-container">
                        {!hasSearched && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#334155' }}>{t('search.exploreTitle')}</h2>
                                <p>{t('search.exploreDesc')}</p>
                            </div>
                        )}

                        {isLoading && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <p style={{ color: '#10b981', fontWeight: '500' }}>{t('search.retrieving')}</p>
                            </div>
                        )}

                        {!isLoading && hasSearched && analysisResult && (
                            <div className="analysis-card" style={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '24px',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
                                animation: 'fadeIn 0.5s ease'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0' }}>{analysisResult.displayName}</h3>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 0 0 0' }}>{t('search.insightTitle')}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            backgroundColor: analysisResult.riskScore > 0.6 ? '#fee2e2' : '#d1fae5',
                                            color: analysisResult.riskScore > 0.6 ? '#ef4444' : '#059669',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '700'
                                        }}>
                                            {analysisResult.riskLevel.toUpperCase()} {t('dashboard.watch')}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>{t('search.riskLabel')}</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155' }}>{(analysisResult.riskScore * 100).toFixed(0)}%</div>
                                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${analysisResult.riskScore * 100}%`, backgroundColor: analysisResult.riskScore > 0.6 ? '#ef4444' : '#10b981' }}></div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>{t('search.confidenceLabel')}</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155' }}>{(analysisResult.confidence * 100).toFixed(0)}%</div>
                                        <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{t('search.validated')}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>🌲</span> {t('search.strategyLabel')}
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {analysisResult.recommendations && analysisResult.recommendations.map((rec, i) => (
                                            <span key={i} style={{
                                                backgroundColor: '#f0fdf4',
                                                color: '#166534',
                                                border: '1px solid #dcfce7',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {rec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                    <Link 
                                        to={`/map?search=${encodeURIComponent(analysisResult.displayName || searchQuery)}`} 
                                        style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', textDecoration: 'none' }}
                                    >
                                        {t('search.viewMap')}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {!isLoading && hasSearched && !analysisResult && !error && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                backgroundColor: '#fff7ed',
                                border: '1px solid #ffedd5',
                                borderRadius: '16px'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#9a3412', marginBottom: '8px' }}>{t('search.pendingTitle')}</h3>
                                <p style={{ fontSize: '14px', color: '#c2410c', lineHeight: '1.5' }}>
                                    {t('search.pendingDesc')}
                                </p>
                                <Link to={`/map?search=${encodeURIComponent(searchQuery)}`} style={{
                                    display: 'inline-block',
                                    marginTop: '16px',
                                    backgroundColor: '#ea580c',
                                    color: 'white',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}>
                                    {t('search.goMap')}
                                </Link>
                            </div>
                        )}

                        {error && (
                            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px' }}>
                                <p style={{ color: '#ef4444' }}>{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default Search
