const supabase = require('../config/supabase');
const { verifyToken } = require('../utils/jwt');

const connectedUsers = new Map();

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    connectedUsers.set(socket.userId, socket.id);
    supabase.from('profiles').update({ is_online: true, socket_id: socket.id, last_seen: new Date().toISOString() }).eq('id', socket.userId).then(() => {});
    socket.join(socket.userId);

    socket.on('typing', (data) => socket.to(data.receiverId).emit('userTyping', { userId: socket.userId, isTyping: data.isTyping }));

    socket.on('messageRead', async (data) => {
      const { data: msg } = await supabase.from('messages').select('sender_id,read_by').eq('id', data.messageId).single();
      const readBy = Array.isArray(msg?.read_by) ? msg.read_by : [];
      if (!readBy.some(r => r.user === socket.userId)) readBy.push({ user: socket.userId, readAt: new Date().toISOString() });
      await supabase.from('messages').update({ read_by: readBy }).eq('id', data.messageId);
      if (msg?.sender_id) io.to(msg.sender_id).emit('messageRead', { messageId: data.messageId, readBy: socket.userId });
    });

    socket.on('callOffer', (data) => socket.to(data.receiverId).emit('callOffer', { ...data, callerId: socket.userId }));
    socket.on('callAnswer', (data) => socket.to(data.callerId).emit('callAnswer', data));
    socket.on('iceCandidate', (data) => socket.to(data.userId).emit('iceCandidate', { candidate: data.candidate, senderId: socket.userId }));
    socket.on('endCall', (data) => socket.to(data.userId).emit('callEnded', { callId: data.callId }));
    socket.on('shareLocation', (data) => socket.to(data.receiverId).emit('locationShared', { ...data.location, senderId: socket.userId }));
    socket.on('joinGroup', (groupId) => socket.join(`group_${groupId}`));
    socket.on('leaveGroup', (groupId) => socket.leave(`group_${groupId}`));

    socket.on('disconnect', async () => {
      connectedUsers.delete(socket.userId);
      await supabase.from('profiles').update({ is_online: false, socket_id: '', last_seen: new Date().toISOString() }).eq('id', socket.userId);
      io.emit('userOffline', { userId: socket.userId, lastSeen: new Date().toISOString() });
    });
  });
};

module.exports = { socketHandler, connectedUsers };
