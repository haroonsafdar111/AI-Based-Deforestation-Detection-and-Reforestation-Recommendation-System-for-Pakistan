import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function ReforestationRecommendationsHelp() {
    const nextTopics = [
        { title: 'Environmental Data', path: '/help/environmental-data', icon: '🌦' },
        { title: 'Forest Trends', path: '/help/forest-trends', icon: '📈' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Reforestation Recommendations</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">🌱 Reforestation Insights</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 What Are Reforestation Recommendations?</h3>
                            <p>These insights highlight areas that are environmentally suitable for reforestation based on regional conditions like soil moisture, temperature, and historical forest cover.</p>
                        </section>

                        <section className="help-section">
                            <h3>🔍 What They Are Based On</h3>
                            <ul>
                                <li><strong>Climate suitability:</strong> Analysis of rainfall and temperature patterns.</li>
                                <li><strong>Vegetation condition:</strong> Current NDVI/EVI health of the soil.</li>
                                <li><strong>Environmental feasibility:</strong> Proximity to existing forest patches.</li>
                            </ul>
                        </section>

                        <section className="help-section">
                            <h3>⚠ Important Note</h3>
                            <p>These recommendations are decision-support guidance intended for analysis and planning, not enforced actions or plantation instructions.</p>
                        </section>

                        <div className="help-tip-box">
                            <strong>🌍 Best Use:</strong> Academic analysis, environmental planning scenarios, and sustainable development discussions.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default ReforestationRecommendationsHelp
