const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    deforestationRisk: {
        high: {
            type: Number,
            required: true,
            default: 80
        },
        medium: {
            type: Number,
            required: true,
            default: 50
        },
        low: {
            type: Number,
            required: true,
            default: 20
        }
    },
    retrainingInterval: {
        type: String,
        required: true,
        enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly'],
        default: 'Monthly'
    },
    alertSensitivity: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High'],
        default: 'High'
    },
    lastRetrainedAt: {
        type: Date,
        default: Date.now
    },
    retrainingDataThreshold: {
        type: Number,
        default: 50
    },
    // Cache freshness configuration
    cacheMaxAge: {
        type: Number, // Hours
        required: true,
        default: 24 // 24 hours
    },
    cacheStaleThreshold: {
        type: Number, // Hours
        required: true,
        default: 6 // Consider stale after 6 hours
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Singleton pattern logic can be enforced at controller level
module.exports = mongoose.model('Config', configSchema);
