const axios = require('axios');

exports.fetchEarthData = async (aoi, timeRange) => {
    const baseURL = process.env.EARTHDATA_BASE_URL;
    const username = process.env.EARTHDATA_USERNAME;
    const password = process.env.EARTHDATA_PASSWORD;

    logger.info(`Fetching REAL NASA EarthData for ${aoi} from ${baseURL}...`);

    try {
        const response = await axios.post(`${baseURL}/api/login`, {}, {
            auth: { username, password }
        });

        return {
            source: 'NASA EarthData',
            token: response.data.token,
            status: 'Authenticated'
        };
    } catch (error) {
        logger.error(`NASA EarthData Connection Failed: ${error.message}`);
        throw error;
    }
};
