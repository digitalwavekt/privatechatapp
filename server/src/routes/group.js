const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { auth } = require('../middleware/auth');

router.post('/create', auth, groupController.createGroup);
router.post('/message', auth, groupController.sendGroupMessage);
router.get('/messages/:groupId', auth, groupController.getGroupMessages);
router.get('/my-groups', auth, groupController.getUserGroups);
router.post('/:groupId/members', auth, groupController.addMember);
router.delete('/:groupId/members/:userId', auth, groupController.removeMember);

module.exports = router;
