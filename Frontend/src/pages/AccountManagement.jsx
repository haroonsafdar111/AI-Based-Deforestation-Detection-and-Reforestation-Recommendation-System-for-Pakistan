import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function AccountManagement() {
    const [activeTab, setActiveTab] = useState('')
    const location = useLocation()
    const navigate = useNavigate()

    const sidebarItems = [
        {
            label: 'Map and Dashboards',
            id: 'Map and Dashboards',
            subItems: [
                { label: 'Overview', id: 'Overview', path: '/help/overview' },
                { label: 'Step-by-step instructions', id: 'Step-by-step instructions', path: '/help/step-by-step' }
            ]
        },
        { label: 'Glossary', id: 'Glossary' },
        { label: 'Account management', id: 'Account management' }
    ]

    return (
        <div className="help-page">
            {/* Header */}
            <Header className="map-header" />

            <div className="help-container container">
                <div className="help-search-bar">
                    <input type="text" placeholder="Search" className="help-search-input" />
                    <button className="help-search-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </div>

                <div className="help-layout">
                    {/* Sidebar */}
                    <aside className="help-sidebar">
                        <ul className="help-nav">
                            {sidebarItems.map((item) => (
                                <li key={item.id} className={`help-nav-item ${activeTab === item.id || (item.id === 'Account management') ? 'active' : ''}`}>
                                    <button
                                        className="help-nav-link"
                                        onClick={() => {
                                            if (item.id === 'Map and Dashboards') {
                                                setActiveTab(activeTab === item.id ? '' : item.id)
                                            } else if (item.id === 'Glossary') {
                                                navigate('/help/glossary')
                                            } else if (item.id === 'Account management') {
                                                navigate('/help/account-management')
                                            } else {
                                                navigate('/help')
                                            }
                                        }}
                                    >
                                        <span className={`arrow-icon ${(activeTab === item.id || item.id === 'Account management') && item.subItems ? 'rotated' : ''}`}>&gt;</span> {item.label}
                                    </button>
                                    {/* Render Sub-items if active and exist */}
                                    {item.subItems && activeTab === item.id && (
                                        <ul className="help-subnav">
                                            {item.subItems.map((subItem) => (
                                                <li key={subItem.id} className="help-subnav-item">
                                                    <div className="help-subnav-link-container">
                                                        <Link to={subItem.path || '#'} className={`help-subnav-link ${location.pathname === subItem.path ? 'active' : ''}`}>
                                                            {subItem.label}
                                                        </Link>
                                                        {location.pathname === subItem.path && <div className="active-dot"></div>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </aside>

                    {/* Main Content */}
                    <main className="help-content step-content">
                        {/* Breadcrumbs */}
                        <div className="article-breadcrumbs">
                            <Link to="/help">Help center home</Link>
                            <span className="breadcrumb-separator">/</span>
                            <span className="breadcrumb-current">Account management</span>
                        </div>

                        <h1 className="help-title">Overview</h1>

                        <p className="overview-text" style={{ marginBottom: '40px' }}>
                            Learn how to set up a MyForestVision account and start managing your subscriptions.
                        </p>

                        <div className="step-cards-list">
                            <Link to="/help/account-management/manage-saved-areas" className="step-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                <div className="step-card-label">MAP AND DASHBOARDS</div>
                                <h3 className="step-card-title">Manage areas saved to MyForestVision</h3>
                                <p className="step-card-text">
                                    Once an area of interest has been created and saved on the map, there are several options for managing, editing and sharing these areas.
                                </p>
                                <div className="step-card-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#97bd3d' }}>
                                        <path d="M5 12h14"></path>
                                        <path d="M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </Link>
                        </div>
                    </main>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    )
}

export default AccountManagement
