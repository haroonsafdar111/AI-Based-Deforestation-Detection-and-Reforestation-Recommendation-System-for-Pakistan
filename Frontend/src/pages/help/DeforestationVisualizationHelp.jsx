import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function DeforestationVisualizationHelp() {
    const nextTopics = [
        { title: 'Forest Trends', path: '/help/forest-trends', icon: '📉' },
        { title: 'Reforestation', path: '/help/reforestation-recommendations', icon: '🌱' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Deforestation Visualization</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🗺 Deforestation Visualization</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What This Map Shows</h3>
                            <p>The deforestation map visually represents forest loss severity across the selected region using color-coded risk zones generated from recent environmental data.</p>
                        </section>

                        <section className="help-section">
                            <h3>🎨 Risk Levels Explained</h3>
                            <ul className="help-risk-list">
                                <li className="card">
                                    <span className="risk-dot red"></span>
                                    <strong>High Risk</strong>
                                    <span>Severe forest cover loss detected.</span>
                                </li>
                                <li className="card">
                                    <span className="risk-dot yellow"></span>
                                    <strong>Moderate Risk</strong>
                                    <span>Noticeable degradation patterns.</span>
                                </li>
                                <li className="card">
                                    <span className="risk-dot green"></span>
                                    <strong>Low Risk</strong>
                                    <span>Stable or minimally affected areas.</span>
                                </li>
                            </ul>
                        </section>

                        <section className="help-section">
                            <h3>🧭 How to Interact</h3>
                            <ul>
                                <li><strong>Zoom & Pan:</strong> Explore specific neighborhoods or forest patches.</li>
                                <li><strong>Data Layers:</strong> Toggle environmental features to understand the cause.</li>
                                <li><strong>Historical View:</strong> See how the risk zones have shifted over time.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>💡 Interpretation Note:</strong> Risk zones indicate where intervention may be needed most urgently.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default DeforestationVisualizationHelp
