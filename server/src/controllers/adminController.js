const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { publicUser, mapMessage, mapActivity } = require('../utils/mapper');
const { sendPushNotification } = require('../utils/notifications');
const { emitForceLogout, emitForceDelete } = require('../socket/emissions');

const getAuthUserId = (req) => {
  return req.user?.id || req.user?._id || req.user?.userId || null;
};

const logActivity = async (req, action, targetId, details = {}) => {
  try {
    await supabase.from('admin_activities').insert({
      user_id: getAuthUserId(req),
      action,
      target_id: targetId || null,
      details,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || ''
    });
  } catch (error) {
    console.error('Admin activity log error:', error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, name, email, password_hash, role, is_active')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error || !admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is not active'
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, admin.password_hash || '');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        userId: admin.id,
        email: admin.email,
        role: admin.role || 'super_admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await logActivity(
      { ...req, user: { id: admin.id } },
      'admin_login',
      admin.id,
      { email: admin.email }
    );

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        _id: admin.id,
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role || 'super_admin',
        status: 'approved',
        is_active: admin.is_active
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: pendingUsers },
      { count: activeUsers },
      { count: blockedUsers },
      { count: totalMessages }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ]);

    const { data: recent, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        pendingUsers: pendingUsers || 0,
        activeUsers: activeUsers || 0,
        blockedUsers: blockedUsers || 0,
        totalMessages: totalMessages || 0
      },
      recentUsers: (recent || []).map(publicUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users: (data || []).map(publicUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('profiles')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;

    if (user.fcm_token) {
      await sendPushNotification(user.fcm_token, {
        title: 'Account Approved',
        body: 'Your account has been approved by admin.'
      });
    }

    await logActivity(req, 'approve_user', userId, {
      userName: user.name || user.email
    });

    res.json({
      success: true,
      message: 'User approved successfully',
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { data: user, error } = await supabase
      .from('profiles')
      .update({
        status: 'blocked',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;

    emitForceLogout(req.app.get('io'), userId, reason || 'Admin blocked account');

    if (user.fcm_token) {
      await sendPushNotification(user.fcm_token, {
        title: 'Account Blocked',
        body: `Your account has been blocked. Reason: ${reason || 'Violation of policies'}`
      });
    }

    await logActivity(req, 'block_user', userId, {
      reason,
      userName: user.name || user.email
    });

    res.json({
      success: true,
      message: 'User blocked successfully',
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.forceDeleteApp = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { data: user, error } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;

    emitForceDelete(req.app.get('io'), userId, reason || 'Admin revoked access');

    if (user.fcm_token) {
      await sendPushNotification(user.fcm_token, {
        title: 'Access Revoked',
        body: `Your app access has been revoked. Reason: ${reason || 'Admin action'}`
      });
    }

    await logActivity(req, 'force_delete_app', userId, {
      reason,
      userName: user.name || user.email
    });

    res.json({
      success: true,
      message: 'Access revoke command sent to user device'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { status, search } = req.query;

    let q = supabase.from('profiles').select('*').eq('role', 'user');

    if (status) q = q.eq('status', status);

    if (search) {
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await q.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users: (data || []).map(publicUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const ids = [...new Set((messages || []).flatMap((m) => [m.sender_id, m.receiver_id]).filter(Boolean))];

    const { data: users } = ids.length
      ? await supabase.from('profiles').select('*').in('id', ids)
      : { data: [] };

    const map = new Map((users || []).map((u) => [u.id, u]));

    res.json({
      success: true,
      messages: (messages || []).map((m) =>
        mapMessage(m, map.get(m.sender_id), map.get(m.receiver_id))
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { data: acts, error } = await supabase
      .from('admin_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const ids = [...new Set((acts || []).flatMap((a) => [a.user_id, a.target_id]).filter(Boolean))];

    const { data: users } = ids.length
      ? await supabase.from('profiles').select('*').in('id', ids)
      : { data: [] };

    const map = new Map((users || []).map((u) => [u.id, u]));

    res.json({
      success: true,
      activities: (acts || []).map((a) =>
        mapActivity(a, map.get(a.user_id), map.get(a.target_id))
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const dailyMap = {};

    for (const m of messages || []) {
      const day = String(m.created_at).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }

    const dailyStats = Object.entries(dailyMap)
      .slice(0, 7)
      .map(([id, count]) => ({ _id: id, count }));

    const statuses = ['pending', 'approved', 'blocked', 'deleted'];
    const userStats = [];

    for (const s of statuses) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
        .eq('role', 'user');

      userStats.push({ _id: s, count: count || 0 });
    }

    res.json({
      success: true,
      dailyStats,
      userStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};