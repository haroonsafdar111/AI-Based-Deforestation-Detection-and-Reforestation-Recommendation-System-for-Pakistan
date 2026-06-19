const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    region: {
        type: String,
        required: true,
        // enum: ['Region A', 'Region B'] // Relaxed for real world usage
    },
    timeRange: {
        start: Date,
        end: Date
    },
    sourceApi: {
        type: String,
        required: true,
        // enum: ['NASA EarthData', 'GFW', 'NASA POWER'] // Relaxed
    },
    rawData: {
        type: Object,
        required: true
    },
    preprocessedData: {
        type: Object
    },
    isPreprocessed: {
        type: Boolean,
        default: false
    },
    fetchTimestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Object
    }
}, {
    timestamps: true
});

const Data = mongoose.model('Data', dataSchema);
module.exports = Data;
