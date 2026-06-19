import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function ReportsHelp() {
    const nextTopics = [
        { title: 'Getting Started', path: '/help/getting-started', icon: '🚀' },
        { title: 'Tips', path: '/help/tips', icon: '💡' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Reports</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">📄 Reports & Downloads</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What Reports Provide</h3>
                            <p>Reports summarize complex system insights into clean, professional documents suitable for offline review and documentation.</p>
                        </section>

                        <section className="help-section">
                            <h3>📁 Available Formats</h3>
                            <ul>
                                <li><strong>PDF Export:</strong> A visually styled summary of the current region's metrics and risk status.</li>
                                <li><strong>Excel/CSV:</strong> Deep-dive data tables containing annual forest loss metrics, CO2 estimates, and year-by-year trends.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>🎯 Pro Tip:</strong> Use the Excel export to create your own custom charts for thesis or presentation materials.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default ReportsHelp
