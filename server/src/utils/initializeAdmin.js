const bcrypt = require('bcryptjs');

async function initializeAdmin(supabase) {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Super Admin';

    if (!email || !password) {
      console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD missing. Skipping admin auto-create.');
      return;
    }

    const { data: existingAdmin, error: findError } = await supabase
      .from('admins')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error('❌ Admin lookup error:', findError.message);
      return;
    }

    if (existingAdmin) {
      console.log('✅ Admin already exists:', email);
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error: insertError } = await supabase
      .from('admins')
      .insert([
        {
          name,
          email,
          password_hash,
          role: 'super_admin',
          is_active: true
        }
      ]);

    if (insertError) {
      console.error('❌ Admin create error:', insertError.message);
      return;
    }

    console.log('✅ Admin created successfully:', email);
  } catch (error) {
    console.error('❌ initializeAdmin error:', error.message);
  }
}

module.exports = initializeAdmin;