import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function Overview() {
    const [activeTab, setActiveTab] = useState('Map and Dashboards')
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
                                <li key={item.id} className={`help-nav-item ${activeTab === item.id ? 'active' : ''}`}>
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
                                        <span className={`arrow-icon ${activeTab === item.id && item.subItems ? 'rotated' : ''}`}>&gt;</span> {item.label}
                                    </button>
                                    {/* Render Sub-items if active and exist */}
                                    {item.subItems && activeTab === item.id && (
                                        <ul className="help-subnav">
                                            {item.subItems.map((subItem) => (
                                                <li key={subItem.id} className="help-subnav-item">
                                                    <div className="help-subnav-link-container">
                                                        <Link to={subItem.path || '#'} className={`help-subnav-link ${subItem.id === 'Overview' ? 'active' : ''}`}>
                                                            {subItem.label}
                                                        </Link>
                                                        {subItem.id === 'Overview' && <div className="active-dot"></div>}
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
                    <main className="help-content overview-content">
                        <h1 className="help-title">Overview</h1>

                        <p className="overview-text">
                            The map & dashboards on ForestVision allow you to explore hundreds of spatial datasets that help explain when, where and why forests are changing around the world.
                        </p>

                        <p className="overview-text">
                            The <span className="highlight-text">map</span> helps tell a visual story about what’s happening to forests in a particular place. Zoom in anywhere in the world to explore how forests are changing, how they’re managed and the values they provide. Layer data – like annual tree cover loss, land use data and satellite imagery – to better understand the underlying causes and impacts of forest change. You can embed a map view on another website, share via social media or email, or take a screenshot to use in a report.
                        </p>

                        <p className="overview-text">
                            The <span className="highlight-text">dashboards</span> help answer important questions about forest change in any area and enable you to view hundreds of statistics through interactive charts and graphs, all derived from analysis of spatial data. Statistics can be customized to be as general or specific as you like and can be easily shared and downloaded for offline use.
                        </p>

                        <p className="overview-text">
                            Get started with our step-by-step instructions, webinars, additional training materials and FAQs.
                        </p>

                    </main>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    )
}

export default Overview
