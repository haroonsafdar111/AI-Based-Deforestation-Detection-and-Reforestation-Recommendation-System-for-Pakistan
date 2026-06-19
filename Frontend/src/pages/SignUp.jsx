import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LanguageContext'
import { authService } from '../services/authService'
import { validatePassword, isPasswordStrong } from '../utils/validation'

function SignUp() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  })

  // Live validation logic
  const passwordValidation = React.useMemo(() => validatePassword(formData.password), [formData.password])
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ''
  const isFormValid = React.useMemo(() => {
    return isPasswordStrong(passwordValidation) && passwordsMatch && formData.username.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
  }, [passwordValidation, passwordsMatch, formData.username, formData.email])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    if (serverError) setServerError('')
    if (successMessage) setSuccessMessage('')
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({
      ...prev,
      [name]: true
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation using shared utility
    const passResults = validatePassword(formData.password)
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!isPasswordStrong(passResults)) {
      newErrors.password = 'Password is invalid'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
    setServerError('')
    setSuccessMessage('')

    try {
      // Real API call
      const response = await authService.register({
        name: formData.username,
        username: formData.username,
        email: formData.email,
        password: formData.password
      })

      console.log('Sign up successful:', response)
      setSuccessMessage('Sign up successful! Redirecting to login...')

      // Redirect to login page after delay
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)

    } catch (error) {
      console.error('Sign up error:', error)
      setServerError(error.message || 'Sign up failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card card">
          <div className="signup-header">
            <h1 className="page-title">{t('auth.signup')}</h1>
            <p className="text-secondary">{t('auth.createAccount')}</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            {serverError && (
              <div className="server-error-alert">
                {serverError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="username">{t('auth.fullName')}</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? 'error' : ''}
                placeholder={t('auth.fullName')}
                autoComplete="username"
              />
              {errors.username && (
                <span className="error-message">{errors.username}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('auth.emailUsername')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder={t('auth.emailUsername')}
                autoComplete="email"
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
                className={errors.password && touched.password ? 'error' : ''}
                placeholder={t('auth.password')}
                autoComplete="new-password"
              />
              {touched.password && (
                <div className="password-checklist">
                  <p className="checklist-title">Password Requirements:</p>
                  <div className={`checklist-item ${passwordValidation.minLength ? 'success' : 'error'}`}>
                    <span className="checklist-icon">{passwordValidation.minLength ? '✔' : '✖'}</span>
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`checklist-item ${passwordValidation.hasUppercase ? 'success' : 'error'}`}>
                    <span className="checklist-icon">{passwordValidation.hasUppercase ? '✔' : '✖'}</span>
                    <span>At least 1 uppercase letter (A–Z)</span>
                  </div>
                  <div className={`checklist-item ${passwordValidation.hasLowercase ? 'success' : 'error'}`}>
                    <span className="checklist-icon">{passwordValidation.hasLowercase ? '✔' : '✖'}</span>
                    <span>At least 1 lowercase letter (a–z)</span>
                  </div>
                  <div className={`checklist-item ${passwordValidation.hasSpecialChar ? 'success' : 'error'}`}>
                    <span className="checklist-icon">{passwordValidation.hasSpecialChar ? '✔' : '✖'}</span>
                    <span>At least 1 special character</span>
                  </div>
                </div>
              )}
              {errors.password && touched.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.confirmPassword && touched.confirmPassword ? 'error' : ''}
                placeholder={t('auth.confirmPassword')}
                autoComplete="new-password"
              />
              {errors.confirmPassword && touched.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary signup-button"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? t('auth.signingUp') : t('auth.signup')}
            </button>

            {successMessage && (
              <div className="signup-success-alert">
                {successMessage}
              </div>
            )}
          </form>

          <div className="signup-footer">
            <p className="text-center">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="login-link">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp

