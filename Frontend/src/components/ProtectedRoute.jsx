import React, { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { authService, decodeJWT } from '../services/authService'

const ProtectedRoute = ({ allowedRoles }) => {
    const [isVerifying, setIsVerifying] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const verifyAuth = async () => {
            const token = localStorage.getItem('accessToken')

            if (!token) {
                setIsAuthenticated(false)
                setIsVerifying(false)
                return
            }

            const decodedToken = decodeJWT(token)
            const currentTime = Date.now() / 1000

            if (decodedToken && decodedToken.exp > currentTime) {
                // Token is still valid
                setIsAuthenticated(true)
                setIsVerifying(false)
            } else {
                // Token missing or expired, try refresh
                try {
                    console.log('ProtectedRoute: Access token expired/missing, attempting proactive refresh...')
                    const newAccessToken = await authService.refreshToken()
                    if (newAccessToken) {
                        setIsAuthenticated(true)
                    } else {
                        setIsAuthenticated(false)
                    }
                } catch (error) {
                    console.error('ProtectedRoute: Refresh failed', error)
                    authService.logout()
                    setIsAuthenticated(false)
                } finally {
                    setIsVerifying(false)
                }
            }
        }

        verifyAuth()
    }, [])

    if (isVerifying) {
        return (
            <div style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc'
            }}>
                <div className="spinner" style={{
                    width: '30px', height: '30px', border: '3px solid #10b981',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 1s linear infinite', marginBottom: '12px'
                }}></div>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Verifying Session...</p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Role check
    const token = localStorage.getItem('accessToken')
    const decodedToken = decodeJWT(token)
    const userRole = decodedToken?.role

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return userRole === 'admin'
            ? <Navigate to="/admin-dashboard" replace />
            : <Navigate to="/profile" replace />
    }

    return <Outlet />
}

export default ProtectedRoute
