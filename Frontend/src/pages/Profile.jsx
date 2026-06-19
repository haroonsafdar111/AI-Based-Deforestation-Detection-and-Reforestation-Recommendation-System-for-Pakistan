import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
// import myGfwImage from '../assets/gfw-homepage-my-gfw-01-1024x506.png'
import Header from '../components/Header'
import Footer from '../components/Footer'

import { authService } from '../services/authService'

function Profile() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [user, setUser] = useState(authService.getCurrentUser())

    const handleLogout = async () => {
        await authService.logout()
        window.location.href = '/login'
    }

    const handleLogin = () => {
        window.location.href = '/login'
    }

    // Helper for user-specific storage keys
    const getUserKey = (baseKey) => {
        const currentUser = authService.getCurrentUser();
        return currentUser ? `${currentUser.id || currentUser.email}_${baseKey}` : baseKey;
    };

    const [savedAreas, setSavedAreas] = useState(JSON.parse(localStorage.getItem(getUserKey('savedAreas')) || '[]'))

    const handleRemoveArea = (id) => {
        const storageKey = getUserKey('savedAreas');
        const updated = savedAreas.filter(area => area.id !== id)
        setSavedAreas(updated)
        localStorage.setItem(storageKey, JSON.stringify(updated))
    }

    return (
        <div className="profile-page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Standard Header */}
            <Header className="map-header" />

            {/* Main Content */}
            <main className="profile-main" style={{ flex: 1, padding: '80px 0', backgroundColor: '#f9fafb' }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>

                    {/* New Toolbar/User Info Section */}
                    <div className="profile-toolbar" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '40px',
                        paddingBottom: '20px',
                        borderBottom: '1px solid #e5e7eb'
                    }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#111827' }}>{t('profile.myForestVision')}</h1>
                            {user && <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>{user.email}</div>}
                        </div>

                        {user && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => navigate('/profile/update')}
                                    style={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #d1d5db',
                                        padding: '10px 20px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff' }}
                                >
                                    <span>✏️</span> {t('profile.updateProfile')}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626' }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444' }}
                                >
                                    {t('profile.logout')} <span>→</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {user ? (
                        <div className="logged-in-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {savedAreas.length > 0 ? (
                                <div className="saved-areas-list" style={{ width: '100%' }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>{t('profile.savedAreas')}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                                        {savedAreas.map(area => (
                                            <div key={area.id} style={{
                                                backgroundColor: '#fff',
                                                padding: '24px',
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>{area.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textTransform: 'capitalize' }}>
                                                        {area.type === 'search' ? t('profile.searchResult') : t('profile.region')} • {new Date(area.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <Link
                                                        to={`/map?${area.type === 'search' ? `search=${area.name}` : `region=${area.name}`}`}
                                                        style={{
                                                            padding: '8px 16px',
                                                            fontSize: '13px',
                                                            color: '#16a34a',
                                                            textDecoration: 'none',
                                                            backgroundColor: '#f0fdf4',
                                                            borderRadius: '6px',
                                                            fontWeight: '600',
                                                            border: '1px solid #dcfce7'
                                                        }}
                                                    >
                                                        {t('profile.viewOnMap')}
                                                    </Link>
                                                    <button
                                                        onClick={() => handleRemoveArea(area.id)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            fontSize: '13px',
                                                            color: '#ef4444',
                                                            backgroundColor: '#fef2f2',
                                                            border: '1px solid #fee2e2',
                                                            borderRadius: '6px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {t('profile.removeArea')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="no-areas-content" style={{
                                    textAlign: 'center',
                                    maxWidth: '600px',
                                    margin: '40px auto',
                                    padding: '60px 40px',
                                    border: '1px solid #f3f4f6',
                                    borderRadius: '12px',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>📍</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '15px', color: '#111827' }}>
                                        {t('profile.noAreas')}
                                    </h2>
                                    <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '30px', fontSize: '16px' }}>
                                        {t('profile.createAreaDesc')}
                                    </p>
                                    <Link to="/map" style={{
                                        backgroundColor: '#97bd3d',
                                        border: 'none',
                                        padding: '14px 28px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        textDecoration: 'none',
                                        display: 'inline-block',
                                        transition: 'background-color 0.2s',
                                        boxShadow: '0 4px 6px -1px rgba(151, 189, 61, 0.3)'
                                    }}>
                                        {t('profile.exploreMap')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="logged-out-content">
                            <h2>{t('profile.pleaseLogin')}</h2>
                            <p>{t('profile.loginRequired')}</p>
                            <button onClick={handleLogin} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>{t('auth.login')}</button>
                            <br /><br />
                            <Link to="/dashboard" style={{ color: '#97bd3d' }}>{t('profile.backToDashboard')}</Link>
                        </div>
                    )}

                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Profile
