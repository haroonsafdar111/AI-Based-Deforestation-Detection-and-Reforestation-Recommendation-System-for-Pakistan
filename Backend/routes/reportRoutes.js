const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middlewares/auth');
const { logAuditAction } = require('../middlewares/audit');

// Public route for downloading files (browser navigation cannot send headers)
router.get('/download/:filename', logAuditAction('report_download'), reportController.downloadFile);

router.use(verifyToken);

router.post('/generate', logAuditAction('report_generation'), reportController.generateReport);
router.post('/export', logAuditAction('data_export'), reportController.exportData);

module.exports = router;
