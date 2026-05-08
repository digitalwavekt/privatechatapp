const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.get('/search/:phone', auth, userController.searchByPhone);
router.get('/contacts', auth, userController.getContacts);
router.post('/contacts', auth, userController.addContact);
router.post('/block/:userId', auth, userController.blockUser);
router.post('/unblock/:userId', auth, userController.unblockUser);
router.get('/online/:userId', auth, userController.getOnlineStatus);

module.exports = router;
