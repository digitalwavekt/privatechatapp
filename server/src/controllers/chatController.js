const supabase = require('../config/supabase');
const { mapMessage, publicUser } = require('../utils/mapper');
const { sendToUser } = require('../services/notificationService');

const getUserId = (req) => {
  return req.user?.userId || req.user?.id || req.user?._id;
};

async function loadUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean))];

  if (!unique.length) return new Map();

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', unique);

  return new Map((data || []).map((u) => [u.id, u]));
}

exports.sendMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);

    const {
      receiverId,
      type,
      messageType,
      content = '',
      mediaUrl = '',
      fileUrl = '',
      thumbnailUrl = '',
      location,
      replyTo
    } = req.body;

    const finalType = type || messageType || 'text';
    const finalMediaUrl = mediaUrl || fileUrl || '';

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'receiverId is required'
      });
    }

    const { data: receiver } = await supabase
      .from('profiles')
      .select('id,status')
      .eq('id', receiverId)
      .maybeSingle();

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        type: finalType,
        content,
        media_url: finalMediaUrl,
        thumbnail_url: thumbnailUrl,
        location: location || null,
        reply_to: replyTo || null,
        is_deleted: false
      })
      .select('*')
      .single();

    if (error) throw error;

    const users = await loadUsers([senderId, receiverId]);

    const senderUser = users.get(senderId);
    const receiverUser = users.get(receiverId);

    const mapped = mapMessage(
      message,
      senderUser,
      receiverUser
    );

    const io = req.app.get('io');

    if (io) {
      io.to(receiverId).emit('newMessage', mapped);
      io.to(senderId).emit('messageSent', mapped);
    }

    try {
      await sendToUser(receiverId, {
        title: senderUser?.name || 'New message',
        body:
          content ||
          (finalType === 'image'
            ? 'Sent you an image'
            : finalType === 'video'
              ? 'Sent you a video'
              : finalType === 'audio'
                ? 'Sent you an audio'
                : 'Sent you a message'),
        data: {
          type: 'message',
          senderId: String(senderId),
          messageId: String(message.id),
          receiverId: String(receiverId)
        },
        channelId: 'pvchat_messages'
      });
    } catch (pushError) {
      console.error('Message push notification error:', pushError);
    }

    return res.status(201).json({
      success: true,
      message: mapped
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const otherUserId = req.params.userId;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const users = await loadUsers(
      (data || []).flatMap((m) => [m.sender_id, m.receiver_id])
    );

    return res.json({
      success: true,
      messages: (data || []).map((m) =>
        mapMessage(m, users.get(m.sender_id), users.get(m.receiver_id))
      )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const readEntry = {
      user: currentUserId,
      readAt: new Date().toISOString()
    };

    const { data: msg } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', req.params.messageId)
      .single();

    const readBy = Array.isArray(msg?.read_by) ? msg.read_by : [];

    if (!readBy.some((r) => r.user === currentUserId)) {
      readBy.push(readEntry);
    }

    await supabase
      .from('messages')
      .update({ read_by: readBy })
      .eq('id', req.params.messageId);

    return res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', req.params.messageId)
      .eq('sender_id', currentUserId);

    return res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw error;

    const latestByUser = new Map();

    for (const m of data || []) {
      const other = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;

      if (other && !latestByUser.has(other)) {
        latestByUser.set(other, m);
      }
    }

    const users = await loadUsers([...latestByUser.keys(), currentUserId]);

    const conversations = [...latestByUser.entries()].map(([otherId, msg]) => ({
      _id: otherId,
      id: otherId,
      user: users.get(otherId) ? publicUser(users.get(otherId)) : otherId,
      lastMessage: mapMessage(
        msg,
        users.get(msg.sender_id),
        users.get(msg.receiver_id)
      ),
      updatedAt: msg.created_at
    }));

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};