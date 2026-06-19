import React, { useState } from 'react'
import Header from '../components/Header'
import { useTranslation } from '../context/LanguageContext'
import { useNotification } from '../context/NotificationContext'
import { feedbackService } from '../services/feedbackService'

function Feedback() {
    const { t } = useTranslation()
    const { addNotification } = useNotification()
    const [formData, setFormData] = useState({
        predictionRating: 0,
        predictionComments: '',
        reforestationRating: 0,
        reforestationComments: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleRatingChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await feedbackService.submitFeedback(formData)

            addNotification({
                type: 'success',
                message: 'Thank you for your feedback! Your input helps improve our models.'
            })

            setFormData({
                predictionRating: 0,
                predictionComments: '',
                reforestationRating: 0,
                reforestationComments: ''
            })
        } catch (error) {
            addNotification({
                type: 'error',
                message: error.message || 'Failed to submit feedback. Please try again.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStars = (rating, field) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={`star ${star <= rating ? 'filled' : ''}`}
                        onClick={() => handleRatingChange(field, star)}
                        style={{
                            cursor: 'pointer',
                            fontSize: '24px',
                            color: star <= rating ? '#fbbf24' : '#e5e7eb',
                            marginRight: '5px'
                        }}
                    >
                        ★
                    </span>
                ))}
            </div>
        )
    }

    return (
        <div className="feedback-page">
            <Header className="map-header" />

            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px', flex: 1 }}>
                <h1 className="page-title text-center" style={{ color: 'white' }}>We Value Your Feedback</h1>
                <p className="text-center" style={{ maxWidth: '600px', margin: '0 auto 40px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    Help us improve ForestVision by rating the accuracy of our predictions and the quality of our reforestation recommendations.
                </p>

                <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>

                    {/* Prediction Accuracy Section */}
                    <div className="form-section" style={{ marginBottom: '40px' }}>
                        <h3 style={{ marginBottom: '15px', color: '#1a1d21' }}>1. Prediction Accuracy</h3>
                        <p className="text-secondary" style={{ marginBottom: '20px', fontSize: '14px' }}>
                            How accurate do you find our forest cover change predictions compared to your local knowledge?
                        </p>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Rating</label>
                            {renderStars(formData.predictionRating, 'predictionRating')}
                        </div>

                        <div className="form-group">
                            <label htmlFor="predictionComments" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Comments & Observations</label>
                            <textarea
                                id="predictionComments"
                                name="predictionComments"
                                value={formData.predictionComments}
                                onChange={handleChange}
                                placeholder="Share specific details about where the prediction matched or missed..."
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '100px', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '30px 0' }} />

                    {/* Reforestation Recommendations Section */}
                    <div className="form-section" style={{ marginBottom: '40px' }}>
                        <h3 style={{ marginBottom: '15px', color: '#1a1d21' }}>2. Reforestation Recommendations</h3>
                        <p className="text-secondary" style={{ marginBottom: '20px', fontSize: '14px' }}>
                            How relevant and feasible were the suggested reforestation sites and species?
                        </p>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Rating</label>
                            {renderStars(formData.reforestationRating, 'reforestationRating')}
                        </div>

                        <div className="form-group">
                            <label htmlFor="reforestationComments" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Suggestions</label>
                            <textarea
                                id="reforestationComments"
                                name="reforestationComments"
                                value={formData.reforestationComments}
                                onChange={handleChange}
                                placeholder="How can we improve our recommendations? Any specific species or areas we missed?"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '100px', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting || (formData.predictionRating === 0 && formData.reforestationRating === 0)}
                            style={{ padding: '12px 30px', fontSize: '16px' }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

export default Feedback
