const axios = require('axios');

exports.fetchPowerData = async (aoi, timeRange) => {
    const baseURL = process.env.NASA_POWER_BASE_URL;
    console.log(`Fetching NASA POWER data for ${aoi} from ${baseURL}...`);

    // Simulate API response
    return {
        source: 'NASA POWER',
        temparature: 28.5,
        precipitation: 120,
        humidity: 80
    };
};
