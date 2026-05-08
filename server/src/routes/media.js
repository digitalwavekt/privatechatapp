const express = require('express');
const router = express.Router();

const mediaController = require('../controllers/mediaController');
const authMiddleware = require('../middleware/auth');

const verifyToken =
    authMiddleware.verifyToken ||
    authMiddleware.auth ||
    authMiddleware.protect ||
    authMiddleware;

router.post('/upload', verifyToken, mediaController.uploadMedia);

module.exports = router;