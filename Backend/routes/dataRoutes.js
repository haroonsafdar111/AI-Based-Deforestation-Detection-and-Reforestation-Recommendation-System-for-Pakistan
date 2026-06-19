const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { verifyToken } = require('../middlewares/auth');
const { logAuditAction } = require('../middlewares/audit');

router.use(verifyToken);

router.post('/fetch', logAuditAction('data_fetch'), dataController.fetchAndStoreData);
router.post('/unified-trigger', logAuditAction('unified_pipeline_trigger'), dataController.triggerUnifiedPipeline);
router.get('/stored', dataController.getStoredData);

// GET latest verified data for a region
router.get('/region/:regionId', dataController.getLatestDataByRegion);

module.exports = router;
