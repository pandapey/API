const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/overview', adminController.overview);
router.get('/users', adminController.users);
router.put('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.get('/projects', adminController.projects);
router.get('/keys', adminController.keys);
router.get('/requests', adminController.requests);
router.get('/errors', adminController.errors);
router.get('/health', adminController.health);
router.get('/audit', adminController.auditTrail);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.putSettings);

module.exports = router;
