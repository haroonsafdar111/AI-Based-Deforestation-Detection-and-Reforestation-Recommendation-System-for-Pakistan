import React from 'react'
import { Link } from 'react-router-dom'

const NextTopics = ({ topics }) => {
    return (
        <section className="next-topics-section container">
            <h2 className="section-title">🚀 Explore More Topics</h2>
            <div className="next-topics-grid">
                {topics.map((topic, index) => (
                    <Link to={topic.path} key={index} className="next-topic-card card">
                        <span className="next-topic-icon">{topic.icon}</span>
                        <div className="next-topic-info">
                            <h4>{topic.title}</h4>
                            <p>Learn more about {topic.title.toLowerCase()}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export default NextTopics
