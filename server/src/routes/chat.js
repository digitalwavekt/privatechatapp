const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.post('/send', auth, chatController.sendMessage);
router.get('/messages/:userId', auth, chatController.getMessages);
router.put('/read/:messageId', auth, chatController.markAsRead);
router.delete('/message/:messageId', auth, chatController.deleteMessage);
router.get('/conversations', auth, chatController.getConversations);

module.exports = router;
