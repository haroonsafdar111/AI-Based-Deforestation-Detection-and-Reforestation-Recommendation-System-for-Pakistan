const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    regionKey: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    displayName: {
        type: String,
        required: true
    },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    riskLevel: {
        type: String,
        enum: ['High', 'MEDIUM', 'Low', 'Moderate'], // Aligning with existing logic
        required: true
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    recommendations: [{
        type: String
    }],
    features: {
        ndvi: Number,
        evi: Number,
        lst: Number,
        soilMoisture: Number,
        temperature: Number,
        rainfall: Number,
        humidity: Number,
        elevation: Number,
        soilType: Number
    },
    forest_loss_trend: [{
        type: mongoose.Schema.Types.Mixed
    }],
    zones: [{
        type: mongoose.Schema.Types.Mixed
    }],
    geometry: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

const Analysis = mongoose.model('Analysis', analysisSchema);
module.exports = Analysis;
