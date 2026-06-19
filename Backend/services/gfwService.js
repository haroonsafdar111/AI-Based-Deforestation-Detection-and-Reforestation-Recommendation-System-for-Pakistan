const axios = require('axios');

exports.fetchGFWData = async (aoi, timeRange) => {
    const baseURL = process.env.GFW_BASE_URL;
    const apiKey = process.env.GFW_API_KEY;
    console.log(`Fetching GFW data for ${aoi} from ${baseURL}...`);

    // Simulate API response
    return {
        source: 'GFW',
        forestLossAlerts: 150,
        confidenceLevel: 'high',
        trends: 'increasing'
    };
};
