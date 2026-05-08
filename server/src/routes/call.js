const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { auth } = require('../middleware/auth');

router.post('/initiate', auth, callController.initiateCall);
router.post('/accept/:callId', auth, callController.acceptCall);
router.post('/end/:callId', auth, callController.endCall);
router.post('/reject/:callId', auth, callController.rejectCall);
router.get('/history', auth, callController.getCallHistory);

module.exports = router;
