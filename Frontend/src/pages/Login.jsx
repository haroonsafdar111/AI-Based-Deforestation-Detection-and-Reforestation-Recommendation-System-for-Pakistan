import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import { authService } from '../services/authService'
import { validatePassword, isPasswordStrong } from '../utils/validation'

function Login() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({
    password: false
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear errors when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    if (serverError) {
      setServerError('')
    }
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({
      ...prev,
      [name]: true
    }))

    if (name === 'password') {
      const passResults = validatePassword(formData.password)
      if (formData.password && !isPasswordStrong(passResults)) {
        setErrors(prev => ({
          ...prev,
          password: 'Password is invalid'
        }))
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email or Username is required'
    }
    // Relaxed validation: Allow if it looks like an email OR if it's a non-empty string
    // We removed strict email regex enforcement because it might be a username

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else {
      const passResults = validatePassword(formData.password)
      if (!isPasswordStrong(passResults)) {
        newErrors.password = 'Password is invalid'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await authService.login(formData.email, formData.password)
      console.log('Login successful:', data)

      let redirectPath = '/profile'
      if (data.user.role === 'admin') {
        redirectPath = '/admin-dashboard'
      }

      // Redirect
      window.location.href = redirectPath
    } catch (error) {
      console.error('Login error:', error)
      setServerError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card card">
          <div className="login-header">
            <h1 className="page-title">{t('auth.welcome')}</h1>
            <p className="text-secondary">{t('auth.loginDesc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {serverError && (
              <div className="server-error-alert">
                {serverError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">{t('auth.emailUsername')}</label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder={t('auth.emailUsername')}
                autoComplete="username"
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.password ? 'error' : ''}
                placeholder={t('auth.password')}
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="login-footer">
            <p className="text-center">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="signup-link">
                {t('auth.signup')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

