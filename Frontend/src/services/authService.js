const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Handle API responses
 */
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Something went wrong');
    }
    return response.json();
};

/**
 * Authenticated Fetch Wrapper
 * Handles token inclusion and automatic refresh
 */
export const fetchWithAuth = async (url, options = {}) => {
    let accessToken = localStorage.getItem('accessToken');

    // Defensive check: handle cases where token might be a string literal "null", "undefined", or empty
    const isTokenValid = accessToken && accessToken !== 'null' && accessToken !== 'undefined';

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (isTokenValid) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
        console.warn(`fetchWithAuth: No valid access token found for ${url}. Request may fail if route is protected.`);
    }

    let response = await fetch(url, { ...options, headers });

    // Handle session expiration (401 Unauthorized)
    if (response.status === 401) {
        console.warn(`fetchWithAuth: Received 401 for ${url}. Attempting token refresh...`);
        try {
            const newAccessToken = await authService.refreshToken();
            if (newAccessToken && newAccessToken !== 'null') {
                headers['Authorization'] = `Bearer ${newAccessToken}`;
                response = await fetch(url, { ...options, headers });
            }
        } catch (refreshError) {
            console.error('fetchWithAuth: Session expired or refresh failed, redirecting to login...');
            authService.logout();
            window.location.href = '/login';
            throw new Error('Session expired');
        }
    }

    return response;
};

/**
 * Auth Service
 */
export const authService = {
    /**
     * Login user
     */
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await handleResponse(response);
        if (data.accessToken) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        return data;
    },

    /**
     * Register user
     */
    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return handleResponse(response);
    },

    /**
     * Logout user
     */
    logout: async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    },

    /**
     * Refresh access token
     */
    refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        const data = await handleResponse(response);
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
        }
        return data.accessToken;
    },

    /**
     * Get current user
     */
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Update user profile
     */
    updateProfile: async (userData) => {
        const response = await fetchWithAuth(`${API_URL}/auth/profile`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
        const data = await handleResponse(response);
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
        }
        return data;
    }
};

/**
 * Simple JWT decoder
 */
export const decodeJWT = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
};
