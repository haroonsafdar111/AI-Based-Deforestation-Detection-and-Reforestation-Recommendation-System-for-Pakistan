import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function TroubleshootingHelp() {
    const nextTopics = [
        { title: 'FAQ', path: '/help/faq', icon: '❓' },
        { title: 'Alerts', path: '/help/alerts', icon: '🔔' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Troubleshooting</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🛠 Troubleshooting</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>❌ Map Not Loading</h3>
                            <ul>
                                <li>Ensure a <strong>Region</strong> is selected from the menu.</li>
                                <li>Check your internet connection for real-time asset loading.</li>
                                <li>Refresh the page to re-trigger the data fetch.</li>
                            </ul>
                        </section>

                        <section className="help-section">
                            <h3>❌ Report Download Failed</h3>
                            <ul>
                                <li>Verify your browser allows data-uri downloads.</li>
                                <li>Ensure a region has been fully analyzed before attempting an export.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>💡 Developer Note:</strong> This project is optimized for modern browsers like Chrome, Edge, and Firefox.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default TroubleshootingHelp
