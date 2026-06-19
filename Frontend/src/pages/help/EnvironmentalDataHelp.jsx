import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function EnvironmentalDataHelp() {
    const nextTopics = [
        { title: 'Forest Trends', path: '/help/forest-trends', icon: '📈' },
        { title: 'Alerts', path: '/help/alerts', icon: '🔔' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Environmental Data</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🌦 Environmental Data</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What Environmental Data Means</h3>
                            <p>Environmental indicators provide the scientific context behind deforestation and reforestation patterns. They help us understand the "why" behind forest changes.</p>
                        </section>

                        <section className="help-section">
                            <h3>📊 Included Indicators</h3>
                            <ul>
                                <li><strong>Vegetation health:</strong> NDVI and EVI metrics showing greenness intensity.</li>
                                <li><strong>Temperature trends:</strong> Surface temperature variability.</li>
                                <li><strong>Rainfall patterns:</strong> Local precipitation data.</li>
                                <li><strong>Soil context:</strong> Moisture and condition indicators.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>🧠 Why It’s Important:</strong> Environmental data helps distinguish between natural clearing and human-driven deforestation.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default EnvironmentalDataHelp
