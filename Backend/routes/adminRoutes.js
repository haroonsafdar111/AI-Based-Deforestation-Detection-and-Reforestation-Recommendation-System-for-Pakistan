const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/rbac');
const { logAuditAction } = require('../middlewares/audit');

// All routes here require admin role
// Admin stats and user management require admin role
router.use(verifyToken);

router.get('/config', authorizeRoles('admin', 'user'), logAuditAction('admin_view_config'), adminController.getConfig);

// Strict admin-only for remaining routes
router.use(authorizeRoles('admin'));

router.get('/users', logAuditAction('admin_view_users'), adminController.getUsers);
router.delete('/users/:id', logAuditAction('admin_delete_user'), adminController.deleteUser);
router.get('/logs', logAuditAction('admin_view_logs'), adminController.getAuditLogs);
router.put('/config', logAuditAction('admin_update_config'), adminController.updateConfig);
router.put('/config', logAuditAction('admin_update_config'), adminController.updateConfig);
router.get('/stats', logAuditAction('admin_view_stats'), adminController.getDashboardStats);
router.get('/data-records', logAuditAction('admin_view_data_records'), adminController.getDataRecords);

module.exports = router;
