const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const initializeAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH || 'admin123';
    const phone = process.env.ADMIN_PHONE || '0000000000';

    if (!email) {
      console.warn('ADMIN_EMAIL missing. Skipping admin seed.');
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('profiles').insert({
      name: 'Admin',
      email: email.toLowerCase(),
      phone,
      password_hash: passwordHash,
      role: 'admin',
      status: 'approved'
    });

    if (error) throw error;
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Admin initialization error:', error.message);
  }
};

module.exports = { initializeAdmin };
