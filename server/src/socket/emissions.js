const { connectedUsers } = require('./handler');

const emitNewMessage = (io, userId, message) => {
  io.to(userId).emit('newMessage', message);
};

const emitMessageRead = (io, userId, messageId) => {
  io.to(userId).emit('messageRead', { messageId });
};

const emitGroupMessage = (io, userId, message) => {
  io.to(userId).emit('groupMessage', message);
};

const emitGroupUpdate = (io, userId, group) => {
  io.to(userId).emit('groupUpdate', group);
};

const emitIncomingCall = (io, userId, callData) => {
  io.to(userId).emit('incomingCall', callData);
};

const emitCallEnded = (io, userId, callId) => {
  io.to(userId).emit('callEnded', { callId });
};

const emitForceLogout = (io, userId, reason) => {
  io.to(userId).emit('forceLogout', { reason, timestamp: new Date() });
};

const emitForceDelete = (io, userId, reason) => {
  io.to(userId).emit('forceDelete', { reason, timestamp: new Date() });
};

const emitUserStatus = (io, userId, status) => {
  io.to(userId).emit('userStatus', status);
};

module.exports = {
  emitNewMessage,
  emitMessageRead,
  emitGroupMessage,
  emitGroupUpdate,
  emitIncomingCall,
  emitCallEnded,
  emitForceLogout,
  emitForceDelete,
  emitUserStatus
};
