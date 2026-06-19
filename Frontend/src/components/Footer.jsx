import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import logo from '../assets/logo.png'

function Footer() {
    const { t } = useTranslation()

    return (
        <footer className="home-footer">
            <div className="footer-container container">
                {/* Top Section */}
                <div className="footer-top">
                    <div className="footer-nav">
                        <Link to="/map" className="footer-link">{t('nav.map')}</Link>
                        <Link to="/dashboard" className="footer-link">{t('nav.dashboard')}</Link>
                        <Link to="/about" className="footer-link">{t('nav.about')}</Link>
                        <Link to="/help" className="footer-link">{t('nav.help')}</Link>
                    </div>

                    <div className="footer-right">
                        <div className="logo">
                            <Link to="/" className="logo-box flex-gap-sm">
                                <img
                                    src={logo}
                                    alt="ForestVision Icon"
                                    className="footer-logo-img"
                                />
                                <span className="logo-text">FORESTVISION</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="footer-divider"></div>

                {/* Bottom Section */}
                <div className="footer-bottom">
                    <div className="footer-legal">
                        <Link to="/cookies" className="footer-legal-link">{t('footer.cookies')}</Link>
                        <Link to="/terms" className="footer-legal-link">{t('footer.terms')}</Link>
                        <Link to="/privacy" className="footer-legal-link">{t('footer.privacy')}</Link>
                        <Link to="/status" className="footer-legal-link">{t('footer.status')}</Link>
                    </div>
                    <p className="footer-copyright">© {new Date().getFullYear()} ForestVision. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
