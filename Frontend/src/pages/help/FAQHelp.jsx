import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import NextTopics from '../../components/help/NextTopics'

function FAQHelp() {
    const faqs = [
        {
            question: "Is this system real-time?",
            answer: "The platform uses the most recently available environmental data from satellite sources, synchronized periodically for analysis."
        },
        {
            question: "Can I analyze multiple regions?",
            answer: "Yes, you can switch between any of Pakistan's provinces or major districts using the region selector badge."
        },
        {
            question: "Can I use reports in my FYP?",
            answer: "Absolutely. The reports are specifically styled for professional documentation and academic vivas."
        }
    ]

    const nextTopics = [
        { title: 'Troubleshooting', path: '/help/troubleshooting-support', icon: '🛠' },
        { title: 'Getting Started', path: '/help/getting-started', icon: '🚀' }
    ]

    return (
        <div className="help-page sub-page">
            <Header className="map-header" />
            <div className="help-container container">
                <div className="help-breadcrumbs">
                    <Link to="/help">Help Center</Link> / <span>FAQ</span>
                </div>

                <main className="help-content-main">
                    <h1 className="help-subpage-title">❓ Frequently Asked Questions</h1>
                    <div className="help-faq-list">
                        {faqs.map((faq, index) => (
                            <div key={index} className="help-card-content" style={{ marginBottom: '30px' }}>
                                <h3 style={{ color: 'var(--color-primary-dark)' }}>{faq.question}</h3>
                                <p style={{ margin: 0 }}>{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </main>

                <NextTopics topics={nextTopics} />
            </div>
            <Footer />
        </div>
    )
}

export default FAQHelp
