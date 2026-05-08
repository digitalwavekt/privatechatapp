const express = require('express');
const router = express.Router();

const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

const verifyToken =
    authMiddleware.verifyToken ||
    authMiddleware.auth ||
    authMiddleware.protect ||
    authMiddleware;

router.post('/send', verifyToken, chatController.sendMessage);
router.get('/messages/:userId', verifyToken, chatController.getMessages);
router.get('/conversations', verifyToken, chatController.getConversations);
router.post('/read/:messageId', verifyToken, chatController.markAsRead);
router.delete('/messages/:messageId', verifyToken, chatController.deleteMessage);

module.exports = router;