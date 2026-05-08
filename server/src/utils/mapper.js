const mapUser = (u = {}) => ({
  _id: u.id,
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatar: u.avatar || '',
  livePhoto: u.live_photo || '',
  role: u.role,
  status: u.status,
  isOnline: !!u.is_online,
  lastSeen: u.last_seen,
  fcmToken: u.fcm_token || '',
  deviceInfo: u.device_info || {},
  createdAt: u.created_at,
  updatedAt: u.updated_at
});

const publicUser = (u = {}) => {
  const mapped = mapUser(u);
  delete mapped.fcmToken;
  return mapped;
};

const mapMessage = (m = {}, sender, receiver) => ({
  _id: m.id,
  id: m.id,
  sender: sender ? publicUser(sender) : m.sender_id,
  receiver: receiver ? publicUser(receiver) : m.receiver_id,
  group: m.group_id,
  type: m.type,
  content: m.content,
  mediaUrl: m.media_url || '',
  thumbnailUrl: m.thumbnail_url || '',
  location: m.location || null,
  isDeleted: !!m.is_deleted,
  deletedFor: m.deleted_for || [],
  readBy: m.read_by || [],
  replyTo: m.reply_to,
  reactions: m.reactions || [],
  createdAt: m.created_at,
  updatedAt: m.updated_at
});

const mapActivity = (a = {}, user, target) => ({
  _id: a.id,
  id: a.id,
  user: user ? publicUser(user) : a.user_id,
  action: a.action,
  target: target ? publicUser(target) : a.target_id,
  details: a.details || {},
  ipAddress: a.ip_address || '',
  userAgent: a.user_agent || '',
  createdAt: a.created_at
});

module.exports = { mapUser, publicUser, mapMessage, mapActivity };
