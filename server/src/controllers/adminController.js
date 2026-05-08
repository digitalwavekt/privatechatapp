const supabase = require('../config/supabase');
const { mapUser, publicUser, mapMessage, mapActivity } = require('../utils/mapper');
const { sendPushNotification } = require('../utils/notifications');
const { emitForceLogout, emitForceDelete } = require('../socket/emissions');

const logActivity = async (req, action, targetId, details = {}) => {
  await supabase.from('admin_activities').insert({
    user_id: req.user.userId,
    action,
    target_id: targetId || null,
    details,
    ip_address: req.ip,
    user_agent: req.get('user-agent') || ''
  });
};

exports.getDashboard = async (req, res) => {
  try {
    const [{ count: totalUsers }, { count: pendingUsers }, { count: activeUsers }, { count: blockedUsers }, { count: totalMessages }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ]);
    const { data: recent } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10);
    res.json({ stats: { totalUsers, pendingUsers, activeUsers, blockedUsers, totalMessages }, recentUsers: (recent || []).map(publicUser) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(publicUser));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: user, error } = await supabase.from('profiles').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', userId).select('*').single();
    if (error) throw error;
    if (user.fcm_token) await sendPushNotification(user.fcm_token, { title: 'Account Approved', body: 'Your account has been approved by admin.' });
    await logActivity(req, 'approve_user', userId, { userName: user.name });
    res.json({ message: 'User approved successfully', user: publicUser(user) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params; const { reason } = req.body;
    const { data: user, error } = await supabase.from('profiles').update({ status: 'blocked', updated_at: new Date().toISOString() }).eq('id', userId).select('*').single();
    if (error) throw error;
    emitForceLogout(req.app.get('io'), userId, reason);
    if (user.fcm_token) await sendPushNotification(user.fcm_token, { title: 'Account Blocked', body: `Your account has been blocked. Reason: ${reason || 'Violation of policies'}` });
    await logActivity(req, 'block_user', userId, { reason, userName: user.name });
    res.json({ message: 'User blocked successfully', user: publicUser(user) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.forceDeleteApp = async (req, res) => {
  try {
    const { userId } = req.params; const { reason } = req.body;
    const { data: user, error } = await supabase.from('profiles').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', userId).select('*').single();
    if (error) throw error;
    emitForceDelete(req.app.get('io'), userId, reason);
    if (user.fcm_token) await sendPushNotification(user.fcm_token, { title: 'Access Revoked', body: `Your app access has been revoked. Reason: ${reason || 'Admin action'}` });
    await logActivity(req, 'force_delete_app', userId, { reason, userName: user.name });
    res.json({ message: 'Access revoke command sent to user device' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { status, search } = req.query;
    let q = supabase.from('profiles').select('*');
    if (status) q = q.eq('status', status);
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(publicUser));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: messages, error } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const ids = [...new Set((messages || []).flatMap(m => [m.sender_id, m.receiver_id]).filter(Boolean))];
    const { data: users } = ids.length ? await supabase.from('profiles').select('*').in('id', ids) : { data: [] };
    const map = new Map((users || []).map(u => [u.id, u]));
    res.json((messages || []).map(m => mapMessage(m, map.get(m.sender_id), map.get(m.receiver_id))));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getActivities = async (req, res) => {
  try {
    const { data: acts, error } = await supabase.from('admin_activities').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const ids = [...new Set((acts || []).flatMap(a => [a.user_id, a.target_id]).filter(Boolean))];
    const { data: users } = ids.length ? await supabase.from('profiles').select('*').in('id', ids) : { data: [] };
    const map = new Map((users || []).map(u => [u.id, u]));
    res.json((acts || []).map(a => mapActivity(a, map.get(a.user_id), map.get(a.target_id))));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const { data: messages } = await supabase.from('messages').select('created_at').order('created_at', { ascending: false }).limit(1000);
    const dailyMap = {};
    for (const m of messages || []) {
      const day = String(m.created_at).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const dailyStats = Object.entries(dailyMap).slice(0, 7).map(([id, count]) => ({ _id: id, count }));
    const statuses = ['pending', 'approved', 'blocked', 'deleted'];
    const userStats = [];
    for (const s of statuses) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', s);
      userStats.push({ _id: s, count });
    }
    res.json({ dailyStats, userStats });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
