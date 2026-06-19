import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function ForestTrendsHelp() {
    const nextTopics = [
        { title: 'Reports', path: '/help/reports', icon: '📄' },
        { title: 'Alerts', path: '/help/alerts', icon: '🔔' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Forest Trends</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">📈 Forest Trends</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What Trend Analysis Shows</h3>
                            <p>Trend analysis visualizes forest cover changes over time, helping identifying long-term cycles of loss or regeneration in Pakistan's districts.</p>
                        </section>

                        <section className="help-section">
                            <h3>📉 Insights You Can Gain</h3>
                            <ul>
                                <li><strong>Rate of loss:</strong> Is deforestation accelerating?</li>
                                <li><strong>Historical context:</strong> Comparing current years with the last two decades.</li>
                                <li><strong>Recovery signs:</strong> Detecting successful reforestation efforts.</li>
                            </ul>
                        </section>

                        <section className="help-section">
                            <h3>🎓 Academic Value</h3>
                            <p>These trends are ideal for Final Year Projects, comparative research, and documenting environmental changes for viva demonstrations.</p>
                        </section>

                        <div className="help-tip-box">
                            <strong>💡 Expert View:</strong> Monthly trends often reveal seasonal patterns related to climate variability.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default ForestTrendsHelp
