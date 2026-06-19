import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function AccountHelp() {
    const nextTopics = [
        { title: 'Getting Started', path: '/help/getting-started', icon: '🚀' },
        { title: 'FAQ', path: '/help/faq', icon: '❓' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>Account & Profile</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">👤 Account & Profile</h1>
                    <div className="help-card-content">
                        <section className="help-section">
                            <h3>🧩 Why Accounts Matter</h3>
                            <p>Managing your account allows you to save specific areas of interest and view personalized environmental history for your research projects.</p>
                        </section>

                        <section className="help-section">
                            <h3>⚙ Available Actions</h3>
                            <ul>
                                <li><strong>Secure Update:</strong> Change your display name and email.</li>
                                <li><strong>Password Protection:</strong> Update your credentials securely.</li>
                                <li><strong>Saved Areas:</strong> Directly access your focused Pakistani districts from the map.</li>
                            </ul>
                        </section>

                        <div className="help-tip-box">
                            <strong>🔐 Privacy:</strong> Your data and saved locations are private and only accessible via your login.
                        </div>
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div >
            <Footer />
        </div >
    )
}

export default AccountHelp
