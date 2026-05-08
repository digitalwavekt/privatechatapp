const supabase = require('../config/supabase');
const { mapMessage } = require('../utils/mapper');
const { sendPushNotification } = require('../utils/notifications');

async function loadUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await supabase.from('profiles').select('*').in('id', unique);
  return new Map((data || []).map(u => [u.id, u]));
}

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, type = 'text', content = '', mediaUrl = '', thumbnailUrl = '', location, replyTo } = req.body;
    if (!receiverId) return res.status(400).json({ message: 'receiverId is required' });

    const { data: message, error } = await supabase.from('messages').insert({
      sender_id: req.user.userId,
      receiver_id: receiverId,
      type,
      content,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      location: location || null,
      reply_to: replyTo || null
    }).select('*').single();
    if (error) throw error;

    const users = await loadUsers([req.user.userId, receiverId]);
    const mapped = mapMessage(message, users.get(message.sender_id), users.get(message.receiver_id));

    const io = req.app.get('io');
    io.to(receiverId).emit('newMessage', mapped);
    io.to(req.user.userId).emit('messageSent', mapped);

    const receiver = users.get(receiverId);
    if (receiver?.fcm_token) {
      await sendPushNotification(receiver.fcm_token, { title: 'New Message', body: content || 'Media message' });
    }

    res.status(201).json(mapped);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${req.user.userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${req.user.userId})`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const users = await loadUsers((data || []).flatMap(m => [m.sender_id, m.receiver_id]));
    res.json((data || []).map(m => mapMessage(m, users.get(m.sender_id), users.get(m.receiver_id))));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.markAsRead = async (req, res) => {
  try {
    const readEntry = { user: req.user.userId, readAt: new Date().toISOString() };
    const { data: msg } = await supabase.from('messages').select('read_by').eq('id', req.params.messageId).single();
    const readBy = Array.isArray(msg?.read_by) ? msg.read_by : [];
    if (!readBy.some(r => r.user === req.user.userId)) readBy.push(readEntry);
    await supabase.from('messages').update({ read_by: readBy }).eq('id', req.params.messageId);
    res.json({ message: 'Message marked as read' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deleteMessage = async (req, res) => {
  try {
    await supabase.from('messages').update({ is_deleted: true }).eq('id', req.params.messageId).eq('sender_id', req.user.userId);
    res.json({ message: 'Message deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getConversations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${req.user.userId},receiver_id.eq.${req.user.userId}`)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;

    const latestByUser = new Map();
    for (const m of data || []) {
      const other = m.sender_id === req.user.userId ? m.receiver_id : m.sender_id;
      if (other && !latestByUser.has(other)) latestByUser.set(other, m);
    }
    const users = await loadUsers([...latestByUser.keys(), req.user.userId]);
    const conversations = [...latestByUser.entries()].map(([otherId, msg]) => ({
      _id: otherId,
      user: users.get(otherId) ? require('../utils/mapper').publicUser(users.get(otherId)) : otherId,
      lastMessage: mapMessage(msg, users.get(msg.sender_id), users.get(msg.receiver_id)),
      updatedAt: msg.created_at
    }));
    res.json(conversations);
  } catch (error) { res.status(500).json({ message: error.message }); }
};
