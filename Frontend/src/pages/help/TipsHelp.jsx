import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function TipsHelp() {
    const nextTopics = [
        { title: 'Getting Started', path: '/help/getting-started', icon: '🚀' },
        { title: 'Forest Trends', path: '/help/forest-trends', icon: '📈' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Smart Usage Tips</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🧠 Smart Usage Tips</h1>
                    <div className="help-card-content">
                        <ul className="help-list-standard" style={{ fontSize: '1.2rem', padding: 0 }}>
                            <li className="card" style={{ padding: '30px', background: '#f8fffb', marginBottom: '20px', border: '1px solid #e0f2e9' }}>
                                <strong>Always select a region first:</strong> Metrics and maps are generated based on specific geographic context.
                            </li>
                            <li className="card" style={{ padding: '30px', background: '#f8fffb', marginBottom: '20px', border: '1px solid #e0f2e9' }}>
                                <strong>Check Trends before conclusions:</strong> Historical context is key to understanding current deforestation alerts.
                            </li>
                            <li className="card" style={{ padding: '30px', background: '#f8fffb', marginBottom: '20px', border: '1px solid #e0f2e9' }}>
                                <strong>Download Excel for deeper analysis:</strong> Use the raw data exported from the system for your own visualizations.
                            </li>
                        </ul>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default TipsHelp
