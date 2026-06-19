const express = require('express');
const router = express.Router();
const riskZoneController = require('../controllers/riskZoneController');
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');

// Base path: /api/v1/risk-zones

// POST /generate - Protected Route (Admin/Analyst only)
router.post(
    '/generate',
    verifyToken,
    authorizeRoles('admin', 'user'),
    riskZoneController.generateRiskZones
);

module.exports = router;
