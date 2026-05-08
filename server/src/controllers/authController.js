const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { mapUser } = require('../utils/mapper');

const createTokens = (user) => {
  const payload = {
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role || 'user'
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return {
    token,
    accessToken: token,
    refreshToken
  };
};

exports.register = async (req, res) => {
  try {
    const { name, fullName, email, password, phone, deviceInfo } = req.body;

    const finalName = name || fullName;

    if (!finalName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password and phone are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${normalizedEmail},phone.eq.${phone}`)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('profiles')
      .insert({
        name: finalName.trim(),
        email: normalizedEmail,
        phone,
        password_hash: passwordHash,
        device_info: deviceInfo || {},
        status: 'pending',
        role: 'user',
        is_online: false
      })
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      userId: user.id,
      user: mapUser(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, deviceInfo, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', 'user')
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || '');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Account pending admin approval'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account blocked by admin'
      });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Account deleted'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    await supabase
      .from('profiles')
      .update({
        device_info: deviceInfo || {},
        fcm_token: fcmToken || '',
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    const tokens = createTokens(user);

    return res.json({
      success: true,
      message: 'Login successful',
      ...tokens,
      user: mapUser({
        ...user,
        is_online: true
      })
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId || decoded.id)
      .maybeSingle();

    if (error || !user || user.status !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const tokens = createTokens(user);

    return res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

exports.updateLivePhoto = async (req, res) => {
  try {
    const { livePhoto } = req.body;
    const userId = req.user?.id || req.user?.userId;

    const { data: user, error } = await supabase
      .from('profiles')
      .update({
        live_photo: livePhoto || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Live photo updated',
      user: mapUser(user)
    });
  } catch (error) {
    console.error('Live photo update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (userId) {
      await supabase
        .from('profiles')
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};