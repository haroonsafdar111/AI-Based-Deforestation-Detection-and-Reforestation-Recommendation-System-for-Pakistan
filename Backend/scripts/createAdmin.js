const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            console.log('⚠️  Admin account already exists.');
            console.log(`   Username: ${adminExists.username}`);
            console.log(`   Email: ${adminExists.email}`);
            process.exit(0);
        }

        // Generate Credentials
        const suffix = Math.floor(Math.random() * 1000);
        const adminUser = {
            name: 'System Admin',
            username: `admin_${suffix}`,
            email: `admin${suffix}@forestvision.com`,
            password: `SecureAdmin${Math.random().toString(36).slice(-8)}!`,
            role: 'admin'
        };

        const user = await User.create(adminUser);

        console.log('\n✅ Admin Account Created Successfully!');
        console.log('------------------------------------------------');
        console.log(`Username: ${user.username}`);
        console.log(`Email:    ${user.email}`);
        console.log(`Password: ${adminUser.password}`);
        console.log('------------------------------------------------');
        console.log('⚠️  SAVE THESE CREDENTIALS NOW. THEY WILL NOT BE SHOWN AGAIN.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
