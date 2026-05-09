const supabase = require('../config/supabase');
const { verifyToken } = require('../utils/jwt');

exports.auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);

    let user = null;

    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      const { data, error } = await supabase
        .from('admins')
        .select('id, role, is_active')
        .eq('id', decoded.userId || decoded.id)
        .single();

      if (error || !data) {
        return res.status(401).json({ message: 'Admin not found' });
      }

      if (!data.is_active) {
        return res.status(403).json({ message: 'Admin account inactive' });
      }

      user = {
        userId: data.id,
        id: data.id,
        role: data.role,
        status: 'approved'
      };
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, status')
        .eq('id', decoded.userId || decoded.id)
        .single();

      if (error || !data) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (data.status === 'blocked') {
        return res.status(403).json({ message: 'Account blocked by admin' });
      }

      if (data.status === 'deleted') {
        return res.status(403).json({ message: 'Account deleted' });
      }

      user = {
        userId: data.id,
        id: data.id,
        role: data.role,
        status: data.status
      };
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.verifyToken = exports.auth;
exports.protect = exports.auth;

exports.requireAdmin = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

exports.adminAuth = async (req, res, next) => {
  exports.auth(req, res, () => {
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  });
};