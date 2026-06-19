const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');
const { logAuditAction } = require('../middlewares/audit');

router.get('/all-risk-alerts', mlController.getRiskAlerts);

router.use(verifyToken);

router.post('/process-and-predict', logAuditAction('ml_model_execution'), mlController.processAndPredict);
router.get('/latest-analysis/:region', mlController.getLatestAnalysis);
router.post('/refresh-analysis/:region', logAuditAction('ml_model_refresh'), mlController.refreshAnalysis);
router.post('/risk-analysis', logAuditAction('rf_risk_analysis'), mlController.riskAnalysis);
router.post('/satellite-analysis', logAuditAction('cnn_satellite_analysis'), mlController.satelliteAnalysis);
router.post('/retrain', authorizeRoles('admin'), logAuditAction('ml_model_retrain'), mlController.retrainModel);

module.exports = router;
