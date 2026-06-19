import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function RegionSelectionHelp() {
    const nextTopics = [
        { title: 'Deforestation View', path: '/help/deforestation-visualization', icon: '🗺' },
        { title: 'Environmental Data', path: '/help/environmental-data', icon: '🌦' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Region Selection</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">📍 Region Selection</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What is Region Selection?</h3>
                            <p>Region selection activates the system’s analytical engine. All deforestation detection, environmental indicators, and reforestation insights are calculated based on the selected geographic region.</p>
                        </section>

                        <section className="help-section">
                            <h3>🎯 Why It Matters</h3>
                            <ul>
                                <li>Forest characteristics vary across Pakistan</li>
                                <li>Climate, vegetation, and land use differ by region</li>
                                <li>Accurate insights require location-specific data</li>
                            </ul>
                        </section>

                        <section className="help-section">
                            <h3>🛠 How to Use</h3>
                            <ol className="help-list-standard">
                                <li>Open the dashboard or map explorer.</li>
                                <li>Click on the <strong>Select Region</strong> badge or button.</li>
                                <li>Choose a province or specific district from the list.</li>
                                <li>The system will automatically load all relevant history and trends.</li>
                            </ol>
                        </section>

                        <div className="help-tip-box">
                            <strong>💡 Pro Tip:</strong> Changing the region refreshes all maps, charts, and reports automatically for that specific area.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default RegionSelectionHelp
