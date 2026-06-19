import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function DashboardHelp() {
    const nextTopics = [
        { title: 'Forest Trends', path: '/help/forest-trends', icon: '📈' },
        { title: 'Reports', path: '/help/reports', icon: '📄' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Dashboard</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">Dashboard Overview</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <p>
                                The ForestVision Dashboard is your central hub for forest metrics. It translates complex satellite and environmental data into easy-to-understand charts and summaries.
                            </p>
                        </section>

                        <section className="help-section">
                            <h2>Dashboard Features</h2>
                            <ul>
                                <li><strong>Summary Cards:</strong> Real-time statistics on forest loss, CO2 emissions, and more.</li>
                                <li><strong>Interactive Charts:</strong> Analyze annual trends and drivers of forest change.</li>
                                <li><strong>Region Insights:</strong> Tailored information specifically for Pakistan's provinces and districts.</li>
                                <li><strong>Navigation Tabs:</strong> Switch between Forest Change, Land Cover, and Climate data views.</li>
                            </ul>
                        </section>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default DashboardHelp
