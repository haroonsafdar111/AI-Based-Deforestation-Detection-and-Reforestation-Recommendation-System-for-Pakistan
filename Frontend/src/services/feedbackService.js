import { fetchWithAuth } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = `${API_URL}/feedback`;

export const feedbackService = {
    submitFeedback: async (feedbackData) => {
        try {
            const response = await fetchWithAuth(BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : null;

            if (!response.ok) {
                throw new Error(data?.message || `Error ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('Feedback Service Error:', error);
            throw error;
        }
    },

    getFeedback: async () => {
        try {
            const response = await fetchWithAuth(BASE_URL);

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : null;

            if (!response.ok) {
                throw new Error(data?.message || `Error ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('Feedback Service Error:', error);
            throw error;
        }
    }
};
