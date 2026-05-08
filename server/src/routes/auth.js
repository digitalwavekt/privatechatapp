const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const verifyToken =
    authMiddleware.verifyToken ||
    authMiddleware.auth ||
    authMiddleware.protect ||
    authMiddleware;

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

router.post('/live-photo', verifyToken, authController.updateLivePhoto);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;