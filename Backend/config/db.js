const mongoose = require('mongoose');
const dns = require('dns');

require('dotenv').config();

// Bypass unreliable local ISP DNS SRV/TXT resolutions for MongoDB Atlas
if (process.env.BYPASS_DNS_OVERRIDE !== 'true') {
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        console.log('[DNS] Configured Google and Cloudflare DNS servers for robust SRV lookup');
    } catch (dnsErr) {
        console.warn('[DNS] Warning: Failed to set custom DNS servers:', dnsErr.message);
    }
}

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
