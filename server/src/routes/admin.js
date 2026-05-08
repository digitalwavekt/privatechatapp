const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

router.get('/dashboard', adminAuth, adminController.getDashboard);
router.get('/pending-users', adminAuth, adminController.getPendingUsers);
router.post('/approve/:userId', adminAuth, adminController.approveUser);
router.post('/block/:userId', adminAuth, adminController.blockUser);
router.post('/force-delete/:userId', adminAuth, adminController.forceDeleteApp);
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/user-chats/:userId', adminAuth, adminController.getUserChats);
router.get('/activities', adminAuth, adminController.getActivities);
router.get('/stats', adminAuth, adminController.getStats);

module.exports = router;
