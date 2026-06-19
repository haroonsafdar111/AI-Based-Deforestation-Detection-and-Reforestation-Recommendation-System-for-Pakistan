const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');
const { logAuditAction } = require('../middlewares/audit');

router.use(verifyToken);

router.post('/', logAuditAction('feedback_submission'), feedbackController.submitFeedback);
router.get('/', authorizeRoles('admin'), feedbackController.getAllFeedback);

module.exports = router;
