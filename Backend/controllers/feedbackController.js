const Feedback = require('../models/Feedback');

// @desc    Submit user feedback
// @route   POST /api/v1/feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
    try {
        const { predictionRating, predictionComments, reforestationRating, reforestationComments } = req.body;

        const feedback = await Feedback.create({
            user: req.user.id,
            predictionRating,
            predictionComments,
            reforestationRating,
            reforestationComments
        });

        res.status(201).json({
            success: true,
            data: feedback
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get all feedback (Admin only)
// @route   GET /api/v1/feedback
// @access  Private/Admin
exports.getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: feedbacks
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
