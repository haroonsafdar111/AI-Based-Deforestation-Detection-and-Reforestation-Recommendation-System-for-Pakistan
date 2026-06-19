import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function Help() {
    const quickHelpCards = [
        {
            title: '🌍 Select a Region',
            text: 'Choose a predefined region to activate analysis. All maps and trends are generated based on the selected region.',
            path: '/help/region-selection',
            icon: '📍'
        },
        {
            title: '🗺 Deforestation Risk Map',
            text: 'Visualize forest loss using interactive maps. Identify high, moderate, and low risk zones across Pakistan.',
            path: '/help/deforestation-visualization',
            icon: '🗺'
        },
        {
            title: '🌱 Reforestation Insights',
            text: 'View suggested areas suitable for reforestation based on regional environmental conditions.',
            path: '/help/reforestation-recommendations',
            icon: '🌱'
        },
        {
            title: '📊 Forest Trends',
            text: 'Analyze forest cover changes over time to identify patterns and compare historical data.',
            path: '/help/forest-trends',
            icon: '📊'
        },
        {
            title: '📄 Reports',
            text: 'Generate downloadable summaries in PDF and CSV formats for documentation and analysis.',
            path: '/help/reports',
            icon: '📄'
        },
        {
            title: '🌦 Environmental Data',
            text: 'Understand the indicators like NDVI, temperature, and rainfall that influence forest health.',
            path: '/help/environmental-data',
            icon: '🌦'
        }
    ]

    return (
        <div className="help-page help-overview">
            <Header className="map-header" />

            <div className="help-hero container">
                <div className="help-overview-card card">
                    <h1>Need help using the system?</h1>
                    <p>
                        This platform helps you analyze deforestation risk and explore reforestation insights for selected regions in Pakistan.
                        Use the sections below to understand features, interpret results, and resolve common issues.
                    </p>
                    <Link to="/help/getting-started" className="btn btn-primary">GET STARTED</Link>
                </div>
            </div>

            <div className="help-grid-section container">
                <h2 className="section-title">🧭 Quick Help</h2>
                <div className="quick-help-grid">
                    {quickHelpCards.map((card, index) => (
                        <Link to={card.path} key={index} className="quick-help-card card">
                            <div className="card-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.text}</p>
                            <span className="card-link">Learn More</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="help-secondary-sections container">
                <div className="help-row">
                    <div className="help-column">
                        <h3>🛠 Support & Tools</h3>
                        <div className="support-links">
                            <Link to="/help/alerts" className="support-card">
                                <span>🔔</span> Alerts & Notifications
                            </Link>
                            <Link to="/help/account" className="support-card">
                                <span>👤</span> Account & Profile
                            </Link>
                            <Link to="/help/troubleshooting-support" className="support-card">
                                <span>🛠</span> Troubleshooting
                            </Link>
                            <Link to="/help/faq" className="support-card">
                                <span>❓</span> FAQ
                            </Link>
                        </div>
                    </div>
                    <div className="help-column">
                        <div className="smart-tips-card cardHighlight">
                            <h3>🧠 Smart Tips</h3>
                            <ul>
                                <li>Always select a region first</li>
                                <li>Combine maps with trends for better insight</li>
                                <li>Use reports for presentations and documentation</li>
                            </ul>
                            <Link to="/help/tips" className="tips-link">View All Tips &rarr;</Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default Help
