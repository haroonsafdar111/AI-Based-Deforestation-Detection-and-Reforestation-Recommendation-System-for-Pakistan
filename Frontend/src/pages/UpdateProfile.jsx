import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import { useNotification } from '../context/NotificationContext'
import Header from '../components/Header'
import Footer from '../components/Footer'

import { authService } from '../services/authService'

function UpdateProfile() {
    const { t } = useTranslation()
    const { addNotification } = useNotification()
    const navigate = useNavigate()

    const [user, setUser] = useState(() => authService.getCurrentUser())
    const [isUpdating, setIsUpdating] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        currentPassword: '',
        newPassword: ''
    })
    const [serverError, setServerError] = useState(null)

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.name || '',
                email: user.email || ''
            }))
        }
    }, [user])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.currentPassword) {
            addNotification({
                type: 'error',
                message: t('profile.updateError')
            })
            return
        }

        setServerError(null)
        setIsUpdating(true)

        try {
            const updateData = {
                name: formData.fullName,
                currentPassword: formData.currentPassword
            }
            if (formData.newPassword) {
                updateData.password = formData.newPassword
            }

            await authService.updateProfile(updateData)

            addNotification({
                type: 'success',
                message: t('profile.updateSuccess')
            })

            setTimeout(() => {
                navigate('/profile')
            }, 1000)
        } catch (error) {
            console.error('Update profile error:', error)
            setServerError(error.message || 'Failed to update profile')
            addNotification({
                type: 'error',
                message: error.message || 'Failed to update profile'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    if (!user) {
        return <div style={{ padding: '100px', textAlign: 'center' }}>Please log in to update your profile.</div>
    }

    return (
        <div className="update-profile-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <Header className="map-header" />

            <main style={{ flex: 1, padding: '80px 20px', backgroundColor: '#f9fafb' }}>
                <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#111827' }}>{t('profile.updateTitle')}</h1>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        {serverError && (
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fee2e2',
                                borderRadius: '8px',
                                color: '#dc2626',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span>⚠️</span> {serverError}
                            </div>
                        )}
                        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '12px', color: '#374151' }}>
                            {t('profile.personalInfo')}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                                    {t('profile.fullName')}
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                                    {t('profile.emailAddress')}
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px', backgroundColor: '#f3f4f6' }}
                                    readOnly
                                />
                                <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                    Email cannot be changed for security reasons.
                                </small>
                            </div>

                            <div style={{ padding: '20px', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '24px', border: '1px solid #ffedd5' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#9a3412' }}>
                                        {t('profile.currentPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        placeholder="Enter current password to save changes"
                                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '16px' }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#9a3412' }}>
                                        {t('profile.newPassword')} (Optional)
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        placeholder="Leave blank to keep current"
                                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '16px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    style={{ padding: '12px 24px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {t('profile.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: isUpdating ? '#cbd5e1' : '#97bd3d',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        cursor: isUpdating ? 'default' : 'pointer'
                                    }}
                                >
                                    {isUpdating ? 'Saving...' : t('profile.saveChanges')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default UpdateProfile
