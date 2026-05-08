const supabase = require('../config/supabase');
const { verifyToken } = require('../utils/jwt');

exports.auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const decoded = verifyToken(token);
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) return res.status(401).json({ message: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ message: 'Account blocked by admin' });
    if (user.status === 'deleted') return res.status(403).json({ message: 'Account deleted' });

    req.user = { userId: user.id, role: user.role, status: user.status };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

exports.adminAuth = async (req, res, next) => {
  exports.auth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};
