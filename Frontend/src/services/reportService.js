import { fetchWithAuth } from './authService';

const BASE_URLS = {
    BACKEND: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
};

export const reportService = {
    /**
     * Generate and trigger download of a report
     * @param {object} params - { region, timeRange, mlResults, format, dataId }
     */
    generateReport: async (params) => {
        try {
            const response = await fetchWithAuth(`${BASE_URLS.BACKEND}/reports/generate`, {
                method: 'POST',
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`Report Generation Failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.downloadUrl) {
                // Trigger download via hidden link
                const downloadLink = document.createElement('a');
                // Ensure full URL if backend returns relative path
                const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1')
                    .replace('/api/v1', '');
                const url = data.downloadUrl.startsWith('http')
                    ? data.downloadUrl
                    : `${backendBase}${data.downloadUrl}`;

                downloadLink.href = url;
                downloadLink.setAttribute('download', '');
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                return true;
            } else {
                throw new Error(data.message || 'No download URL returned');
            }
        } catch (error) {
            console.error("Error generating report:", error);
            throw error;
        }
    }
};
