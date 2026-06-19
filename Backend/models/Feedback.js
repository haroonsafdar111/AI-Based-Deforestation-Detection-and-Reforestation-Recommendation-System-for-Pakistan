const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    predictionRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    predictionComments: {
        type: String,
        trim: true
    },
    reforestationRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reforestationComments: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
