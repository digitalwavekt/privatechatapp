const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

const verifyToken =
    authMiddleware.verifyToken ||
    authMiddleware.auth ||
    authMiddleware.protect ||
    authMiddleware;

const requireAdmin =
    authMiddleware.requireAdmin ||
    ((req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        next();
    });

router.post('/login', adminController.login);

router.get('/dashboard', verifyToken, requireAdmin, adminController.getDashboard);
router.get('/stats', verifyToken, requireAdmin, adminController.getStats);
router.get('/pending-users', verifyToken, requireAdmin, adminController.getPendingUsers);
router.post('/approve/:userId', verifyToken, requireAdmin, adminController.approveUser);
router.post('/block/:userId', verifyToken, requireAdmin, adminController.blockUser);
router.post('/force-delete/:userId', verifyToken, requireAdmin, adminController.forceDeleteApp);
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);
router.get('/user-chats/:userId', verifyToken, requireAdmin, adminController.getUserChats);
router.get('/activities', verifyToken, requireAdmin, adminController.getActivities);

module.exports = router;