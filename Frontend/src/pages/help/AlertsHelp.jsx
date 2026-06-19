import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function AlertsHelp() {
    const nextTopics = [
        { title: 'Dashboard', path: '/help/dashboard', icon: '📊' },
        { title: 'Troubleshooting', path: '/help/troubleshooting-support', icon: '🛠' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Alerts</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🔔 Alerts & Notifications</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What Are Alerts?</h3>
                            <p>Alerts notify users when deforestation risk exceeds predefined thresholds in Pakistan's focused regions, signaling potential environmental distress.</p>
                        </section>

                        <section className="help-section">
                            <h3>🚨 When Alerts Appear</h3>
                            <ul>
                                <li><strong>High Loss Detection:</strong> When forest cover drops significantly within a short period.</li>
                                <li><strong>Risk Escalation:</strong> When environmental indicators (e.g., LST) spike to critical levels.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>⚠ Important:</strong> Alerts are intended for scientific monitoring and should be verified against historical trends.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default AlertsHelp
