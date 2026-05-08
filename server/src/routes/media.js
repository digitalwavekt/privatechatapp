const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { auth } = require('../middleware/auth');

router.post('/upload', auth, mediaController.uploadMiddleware, mediaController.uploadFile);

module.exports = router;
