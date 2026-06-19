import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function StepByStep() {
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

    const stepsData = [
        {
            label: 'MAP AND DASHBOARDS',
            title: 'Use the map and dashboards',
            text: 'The map allows you to visualize and analyze dozens of data layers. Dashboards provide statistics on forest change trends in the form of interactive data charts.',
            path: '/help/step-by-step/use-map'
        },
        {
            label: 'MAP AND DASHBOARDS',
            title: 'Adjust map and data settings',
            text: 'ForestVision offers several ways to customize the map view as well as the data you are viewing. Learn how to adjust map and data layer settings.',
            path: '/help/step-by-step/adjust-settings'
        },
        {
            label: 'MAP AND DASHBOARDS',
            title: 'Search for an area on the map',
            text: 'The search tool on ForestVision offers an easy way to quickly find an area or data layer on the map.',
            path: '/help/step-by-step/search-area'
        },
        {
            label: 'MAP AND DASHBOARDS',
            title: 'Analyze data within an area on the map',
            text: 'The data analysis tool is an easy way to assess forest change within an area on the map. You can analyze countries, subnational areas, shapes from contextual layers or custom areas.',
            path: '/help/step-by-step/analyze-data'
        },
        {
            label: 'MAP AND DASHBOARDS',
            title: 'Select and customize the basemap',
            text: 'One of ForestVision\'s most important tools for monitoring an area and communicating where deforestation has likely occurred is the customizable basemap.',
            path: '/help/step-by-step/customize-basemap'
        }
    ]

    return (
        <div className="help-page">
            {/* Header */}
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
                                                        <Link to={subItem.path || '#'} className={`help-subnav-link ${subItem.id === 'Step-by-step instructions' ? 'active' : ''}`}>
                                                            {subItem.label}
                                                        </Link>
                                                        {subItem.id === 'Step-by-step instructions' && <div className="active-dot"></div>}
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
                        <h1 className="help-title">Step-by-step instructions</h1>

                        <p className="overview-text">
                            Explore step-by-step instructions to learn how to use the map and dashboards to monitor forest change.
                        </p>

                        <div className="step-cards-list">
                            {stepsData.map((step, index) => (
                                <div key={index} className="step-card">
                                    <div className="step-card-label">{step.label}</div>
                                    <h3 className="step-card-title">{step.title}</h3>
                                    <p className="step-card-text">{step.text}</p>
                                    <Link to={step.path} className="step-card-arrow" aria-label={`Go to ${step.title}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14"></path>
                                            <path d="M12 5l7 7-7 7"></path>
                                        </svg>
                                    </Link>
                                </div>
                            ))}
                        </div>

                    </main>
                </div>
            </div>

            {/* Footer */}
            {/* Footer */}
            <Footer />
        </div>
    )
}

export default StepByStep
