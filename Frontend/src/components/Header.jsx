import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import { useNotification } from '../context/NotificationContext'
import { authService } from '../services/authService'
import logo from '../assets/logo.png'

function Header({ className = 'map-header' }) {
    const { t, toggleLanguage } = useTranslation()
    const { notifications, removeNotification, markAsRead } = useNotification()
    const [isLangOpen, setIsLangOpen] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

    const user = authService.getCurrentUser()

    return (
        <header className={className}>
            <div className="header-container container">
                <div className="header-content flex-between">
                    <div className="logo">
                        <Link to="/" className="logo-box flex-gap-sm">
                            <img
                                src={logo}
                                alt="ForestVision Icon"
                                className="logo-img"
                            />
                            <span className="logo-text">FORESTVISION</span>
                        </Link>
                    </div>

                    <nav className="main-nav">
                        <Link to="/map" className="nav-link">{t('nav.map')}</Link>
                        <Link to="/dashboard" className="nav-link">{t('nav.dashboard')}</Link>
                        {/* Admin Link */}
                        {user?.role === 'admin' && (
                            <Link to="/admin-dashboard" className="nav-link" style={{ color: '#ef4444' }}>Admin</Link>
                        )}
                        <Link to="/help" className="nav-link">
                            {t('nav.help')}
                        </Link>
                        <Link to="/about" className="nav-link">
                            {t('nav.about')}
                        </Link>
                    </nav>

                    <div className="header-utils flex-center flex-gap-md">
                        <div className="language-selector" style={{ fontSize: '14px', fontWeight: 'bold' }} onClick={() => setIsLangOpen(!isLangOpen)}>
                            {t('header.language')} <span className="dropdown-arrow" style={{ fontSize: '10px' }}>▼</span>
                            {isLangOpen && (
                                <div className="language-dropdown">
                                    <div className="language-option" onClick={(e) => { e.stopPropagation(); toggleLanguage('ENGLISH'); setIsLangOpen(false); }}>ENGLISH</div>
                                    <div className="language-option" onClick={(e) => { e.stopPropagation(); toggleLanguage('URDU'); setIsLangOpen(false); }}>اردو</div>
                                </div>
                            )}
                        </div>
                        <Link to="/search" className="icon-btn" aria-label={t('header.search')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </Link>
                        <div className="icon-btn" aria-label={t('header.notifications')} style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {/* Notification Dot (optional, if there are notifications) */}
                            {notifications.length > 0 && <span className="notification-badge"></span>}

                            {isNotificationsOpen && (
                                <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <div className="notification-header" style={{
                                        padding: '15px 20px',
                                        borderBottom: '1px solid #f0f0f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'white'
                                    }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>NOTIFICATIONS</span>
                                        <button className="notification-close" onClick={() => setIsNotificationsOpen(false)} style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '20px',
                                            cursor: 'pointer',
                                            color: '#666',
                                            padding: '0'
                                        }}>&times;</button>
                                    </div>
                                    <div className="notification-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div className="notification-empty" style={{
                                                padding: '40px 20px',
                                                textAlign: 'center',
                                                color: '#888',
                                                fontSize: '14px'
                                            }}>
                                                <p>Check back here soon for more updates!</p>
                                            </div>
                                        ) : (
                                            <ul className="notification-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {notifications.map((notif) => (
                                                    <li key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`} style={{
                                                        padding: '12px 20px',
                                                        borderBottom: '1px solid #f5f5f5',
                                                        cursor: 'pointer',
                                                        background: notif.read ? 'white' : '#f9fff0',
                                                        transition: 'background 0.2s',
                                                        position: 'relative'
                                                    }} onClick={() => markAsRead(notif.id)}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: notif.type === 'risk' ? '#ef4444' : '#2d6a3e' }}>
                                                                {notif.title || 'ALER_NOTIFICATION'}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#999' }}>
                                                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
                                                            {notif.message}
                                                        </div>
                                                        <button
                                                            className="delete-notif"
                                                            style={{
                                                                position: 'absolute',
                                                                right: '10px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                border: 'none',
                                                                background: 'none',
                                                                color: '#ccc',
                                                                cursor: 'pointer',
                                                                fontSize: '14px',
                                                                opacity: 0
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.opacity = 1}
                                                            onMouseLeave={(e) => e.target.style.opacity = 0}
                                                            onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Link to={user ? '/profile' : '/login'} className="icon-btn" aria-label={t('header.profile')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
