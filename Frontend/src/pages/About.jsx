import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

function About() {
    return (
        <div className="about-page">
            <Header className="map-header" />

            {/* Hero Section */}
            <section className="about-hero">
                <div className="about-hero-content container">
                    <h1 className="about-hero-title">AI-Based Deforestation Detection & Reforestation Recommendation System for Pakistan</h1>
                    <p className="about-hero-description">
                        A smart environmental monitoring platform designed to identify deforestation trends and support sustainable reforestation planning across Pakistan. By transforming environmental and satellite data into clear visual insights, the system helps stakeholders understand forest loss patterns and take informed action for ecological protection and climate resilience.
                    </p>
                </div>
            </section>

            {/* Content Cards Section */}
            <section className="about-content container">
                <div className="about-cards-grid">

                    {/* Card 1: Background & Context */}
                    <div className="about-card">
                        <div className="about-card-icon">🌍</div>
                        <h2 className="about-card-title">Background & Context</h2>
                        <p className="about-card-text">
                            Forests are essential for maintaining ecological balance, protecting biodiversity, and regulating climate systems. They help reduce carbon emissions, prevent soil erosion, and support water conservation. In Pakistan, forest cover remains critically low and continues to decline due to illegal logging, population pressure, agricultural expansion, and climate-related disasters.
                        </p>
                        <p className="about-card-text">
                            This ongoing deforestation has intensified environmental challenges such as rising temperatures, loss of wildlife habitats, increased flooding, and land degradation, highlighting the urgent need for effective forest monitoring and restoration planning.
                        </p>
                    </div>

                    {/* Card 2: Problem Overview */}
                    <div className="about-card">
                        <div className="about-card-icon">⚠️</div>
                        <h2 className="about-card-title">Problem Overview</h2>
                        <p className="about-card-text">
                            Current forest monitoring practices in Pakistan largely depend on manual surveys and periodic reports. These methods are time-consuming, resource-intensive, and often outdated by the time data becomes available. As a result, deforestation activities may go unnoticed for long periods, limiting the ability of authorities and environmental organizations to respond effectively.
                        </p>
                        <p className="about-card-text">
                            There is a growing need for a centralized, intelligent platform that can continuously analyze forest conditions and present actionable insights in an accessible manner.
                        </p>
                    </div>

                    {/* Card 3: Focus on Deforestation Detection */}
                    <div className="about-card">
                        <div className="about-card-icon">🔍</div>
                        <h2 className="about-card-title">Focus on Deforestation Detection</h2>
                        <p className="about-card-text">
                            This system emphasizes the identification of deforestation patterns and high-risk zones across selected regions of Pakistan. By analyzing environmental indicators and spatial data, the platform highlights areas experiencing forest degradation and allows users to observe changes over time.
                        </p>
                        <p className="about-card-text">
                            Visual representation of forest loss enables better understanding of deforestation severity and supports timely intervention where forest resources are under threat.
                        </p>
                    </div>

                    {/* Card 4: Reforestation Planning & Sustainability */}
                    <div className="about-card">
                        <div className="about-card-icon">🌱</div>
                        <h2 className="about-card-title">Reforestation Planning & Sustainability</h2>
                        <p className="about-card-text">
                            Beyond detecting forest loss, the platform supports sustainable reforestation planning by considering local environmental conditions. Instead of applying uniform tree-planting strategies, the system promotes region-specific recommendations that align with climate and soil characteristics.
                        </p>
                        <p className="about-card-text">
                            This approach encourages long-term survival of planted trees and maximizes ecological benefits, contributing to healthier ecosystems and improved environmental resilience.
                        </p>
                    </div>

                    {/* Card 5: Interactive Visualization & Accessibility */}
                    <div className="about-card">
                        <div className="about-card-icon">📊</div>
                        <h2 className="about-card-title">Interactive Visualization & Accessibility</h2>
                        <p className="about-card-text">
                            All analytical results are presented through a web-based interactive dashboard designed for clarity and ease of use. Complex environmental data is transformed into maps, charts, and trend visuals that allow users to explore forest conditions without requiring technical expertise.
                        </p>
                        <p className="about-card-text">
                            This makes the platform suitable for a wide range of users, including government agencies, environmental organizations, researchers, students, and the general public.
                        </p>
                    </div>

                    {/* Card 6: Impact & Relevance */}
                    <div className="about-card">
                        <div className="about-card-icon">🚀</div>
                        <h2 className="about-card-title">Impact & Relevance</h2>
                        <p className="about-card-text">
                            The system supports informed decision-making by providing clear insights into deforestation trends and reforestation potential. It can assist in conservation planning, environmental research, policy formulation, and awareness initiatives.
                        </p>
                        <p className="about-card-text">
                            By bridging the gap between deforestation detection and restoration planning, the platform contributes to sustainable forest management and supports national efforts to address climate change and environmental degradation in Pakistan.
                        </p>
                    </div>

                </div>
            </section>

            <Footer />
        </div>
    )
}

export default About
