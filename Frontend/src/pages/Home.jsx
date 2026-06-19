import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import mapImage from '../assets/Mapimage.png'

function Home() {
  const { t } = useTranslation()
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('.hero-section')
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom
        // Hide when hero section is out of view (scrolled past it)
        setShowScrollIndicator(heroBottom > window.innerHeight / 2)
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Check initial state
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollDown = () => {
    const featuresSection = document.querySelector('.features-section')
    if (featuresSection) {
      const header = document.querySelector('.home-header')
      const headerHeight = header ? header.offsetHeight : 60
      const sectionPosition = featuresSection.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = sectionPosition - headerHeight - 20 // 20px extra spacing

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }
  return (
    <div className="home-page">
      {/* Header */}
      <Header className="home-header" />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content container">
          <div className="hero-text">
            <h1 className="hero-title">{t('hero.title')}</h1>
            <p className="hero-description">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer Scroll Indicator */}
      {showScrollIndicator && (
        <button
          className="scroll-indicator"
          onClick={handleScrollDown}
          aria-label="Scroll to next section"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* New Features Section */}
      <section className="features-section">
        <div className="map-background" style={{ backgroundImage: `url(${mapImage})` }}></div>
        <div className="features-container container">
          <div className="features-content">
            <h2 className="features-title">{t('home.features.title')}</h2>
            <p className="features-subtitle">{t('home.features.subtitle')}</p>

            <div className="features-cards">
              <div className="feature-card card">
                <h3 className="feature-card-title">{t('home.features.analysis.title')}</h3>
                <p className="feature-card-description">{t('home.features.analysis.desc')}</p>
                <Link to="/dashboard" className="feature-read-more">
                  {t('home.exploreDashboard')}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              </div>

              <div className="feature-card card">
                <h3 className="feature-card-title">{t('home.features.risk.title')}</h3>
                <p className="feature-card-description">{t('home.features.risk.desc')}</p>
                <Link to="/map" className="feature-read-more">
                  {t('home.viewRiskMap')}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              </div>

              <div className="feature-card card">
                <h3 className="feature-card-title">{t('home.features.suitability.title')}</h3>
                <p className="feature-card-description">{t('home.features.suitability.desc')}</p>
                <Link to="/map" className="feature-read-more">
                  {t('home.viewInsights')}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              </div>
            </div>

            <div className="features-sidebar">
              <div className="sidebar-card card">
                <h4 className="sidebar-title">{t('home.features.trends.title')}</h4>
                <p className="sidebar-location">{t('home.features.trends.desc')}</p>
                <Link to="/dashboard" className="sidebar-link">
                  {t('home.viewTrends')}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="my-forestvision-btn-container">
          <Link to={localStorage.getItem('user') ? '/profile' : '/login'} className="btn btn-secondary my-forestvision-btn">
            FORESTVISION
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Home

