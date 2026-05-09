const supabase = require('../config/supabase');
const { mapUser, publicUser } = require('../utils/mapper');

exports.getProfile = async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', req.user.userId).single();
    if (error) throw error;
    res.json(mapUser(data));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar, livePhoto, pushSubscription } = req.body;
    const update = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;
    if (livePhoto !== undefined) update.live_photo = livePhoto;
    if (pushSubscription !== undefined) update.push_subscription = pushSubscription;

    const { data, error } = await supabase.from('profiles').update(update).eq('id', req.user.userId).select('*').single();
    if (error) throw error;
    res.json({ message: 'Profile updated', user: mapUser(data) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.searchByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'approved')
      .neq('id', req.user.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(data));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getContacts = async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('contacts')
      .select('contact_id')
      .eq('user_id', req.user.userId);

    if (error) throw error;

    const ids = (rows || []).map((r) => r.contact_id).filter(Boolean);

    if (!ids.length) {
      return res.json({
        success: true,
        contacts: []
      });
    }

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (usersError) throw usersError;

    res.json({
      success: true,
      contacts: (users || []).map(publicUser)
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addContact = async (req, res) => {
  try {
    const contactId = req.body.contactId || req.body.userId;

    if (!contactId) {
      return res.status(400).json({ success: false, message: 'contactId/userId required' });
    }

    if (contactId === req.user.userId) {
      return res.status(400).json({ success: false, message: 'Cannot add yourself' });
    }

    const { data: contactUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (userError) throw userError;

    if (!contactUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { error } = await supabase
      .from('contacts')
      .upsert(
        {
          user_id: req.user.userId,
          contact_id: contactId
        },
        { onConflict: 'user_id,contact_id' }
      );

    if (error) throw error;

    res.json({
      success: true,
      message: 'Contact added successfully',
      contact: publicUser(contactUser)
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    await supabase.from('blocked_users').upsert({ user_id: req.user.userId, blocked_user_id: req.params.userId }, { onConflict: 'user_id,blocked_user_id' });
    res.json({ message: 'User blocked' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.unblockUser = async (req, res) => {
  try {
    await supabase.from('blocked_users').delete().eq('user_id', req.user.userId).eq('blocked_user_id', req.params.userId);
    res.json({ message: 'User unblocked' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getOnlineStatus = async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id,is_online,last_seen').eq('id', req.params.userId).single();
    if (error) throw error;
    res.json({ userId: data.id, isOnline: data.is_online, lastSeen: data.last_seen });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
