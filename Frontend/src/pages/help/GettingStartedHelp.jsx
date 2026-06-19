import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function GettingStartedHelp() {
    const nextTopics = [
        { title: 'Dashboard', path: '/help/dashboard', icon: '📊' },
        { title: 'Region Selection', path: '/help/region-selection', icon: '📍' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Getting Started</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">Getting Started</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h2>Need help using the system?</h2>
                            <p>
                                This platform helps you analyze deforestation risk and explore reforestation insights for selected regions in Pakistan.
                                Follow the steps below to begin your analysis and understand the forest dynamics of your area of interest.
                            </p>
                        </section>

                        <section className="help-section">
                            <h2>Basic Workflow</h2>
                            <ol className="help-steps-list">
                                <li><strong>Select a Region:</strong> Start by choosing a district or province from the region selector.</li>
                                <li><strong>Analyze Trends:</strong> View the forest cover loss charts and environmental indicators for the selected area.</li>
                                <li><strong>Explore the Map:</strong> Use the interactive map to visualize deforestation risk and reforestation potential.</li>
                                <li><strong>Download Reports:</strong> Generate an Excel or PDF summary of your findings for documentation.</li>
                            </ol>
                        </section>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default GettingStartedHelp
