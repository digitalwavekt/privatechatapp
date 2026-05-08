const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { generateTokens } = require('../utils/jwt');
const { mapUser } = require('../utils/mapper');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, deviceInfo } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'name, email, password and phone are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${normalizedEmail},phone.eq.${phone}`)
      .maybeSingle();

    if (existing) return res.status(400).json({ message: 'User already exists with this email or phone' });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('profiles')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        phone,
        password_hash: passwordHash,
        device_info: deviceInfo || {},
        status: 'pending',
        role: 'user'
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Registration successful. Waiting for admin approval.',
      userId: user.id,
      user: mapUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, deviceInfo, fcmToken } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'pending') return res.status(403).json({ message: 'Account pending admin approval' });
    if (user.status === 'blocked') return res.status(403).json({ message: 'Account blocked by admin' });
    if (user.status === 'deleted') return res.status(403).json({ message: 'Account deleted' });

    await supabase
      .from('profiles')
      .update({ device_info: deviceInfo || {}, fcm_token: fcmToken || '', updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const tokens = generateTokens(user.id);
    res.json({ message: 'Login successful', user: mapUser(user), ...tokens });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { data: user } = await supabase.from('profiles').select('id,status').eq('id', decoded.userId).single();
    if (!user || user.status !== 'approved') return res.status(401).json({ message: 'Invalid refresh token' });

    res.json(generateTokens(decoded.userId));
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.updateLivePhoto = async (req, res) => {
  try {
    const { livePhoto } = req.body;
    const { data: user, error } = await supabase
      .from('profiles')
      .update({ live_photo: livePhoto || '', updated_at: new Date().toISOString() })
      .eq('id', req.user.userId)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ message: 'Live photo updated', user: mapUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
