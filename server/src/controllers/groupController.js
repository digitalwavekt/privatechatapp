const supabase = require('../config/supabase');
const { mapMessage } = require('../utils/mapper');

const mapGroup = (g, members = []) => ({
  _id: g.id,
  id: g.id,
  name: g.name,
  description: g.description || '',
  avatar: g.avatar || '',
  creator: g.creator_id,
  members,
  admins: members.filter(m => m.role === 'admin').map(m => m.user),
  isDeleted: g.is_deleted,
  createdAt: g.created_at,
  updatedAt: g.updated_at
});

exports.createGroup = async (req, res) => {
  try {
    const { name, description = '', avatar = '', members = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name required' });
    const { data: group, error } = await supabase.from('groups').insert({ name, description, avatar, creator_id: req.user.userId }).select('*').single();
    if (error) throw error;
    const rows = [...new Set([req.user.userId, ...members])].map(userId => ({ group_id: group.id, user_id: userId, role: userId === req.user.userId ? 'admin' : 'member' }));
    await supabase.from('group_members').insert(rows);
    res.status(201).json(mapGroup(group, rows.map(r => ({ user: r.user_id, role: r.role, joinedAt: new Date().toISOString() }))));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, type = 'text', content = '', mediaUrl = '', thumbnailUrl = '', location } = req.body;
    if (!groupId) return res.status(400).json({ message: 'groupId required' });
    const { data: member } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', req.user.userId).maybeSingle();
    if (!member) return res.status(403).json({ message: 'You are not a group member' });
    const { data: msg, error } = await supabase.from('messages').insert({ sender_id: req.user.userId, group_id: groupId, type, content, media_url: mediaUrl, thumbnail_url: thumbnailUrl, location: location || null }).select('*').single();
    if (error) throw error;
    const mapped = mapMessage(msg);
    req.app.get('io').to(`group_${groupId}`).emit('newGroupMessage', mapped);
    res.status(201).json(mapped);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { data, error } = await supabase.from('messages').select('*').eq('group_id', groupId).eq('is_deleted', false).order('created_at', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(m => mapMessage(m)));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getUserGroups = async (req, res) => {
  try {
    const { data: memberships, error } = await supabase.from('group_members').select('group_id,role,joined_at').eq('user_id', req.user.userId);
    if (error) throw error;
    const ids = (memberships || []).map(m => m.group_id);
    if (!ids.length) return res.json([]);
    const { data: groups } = await supabase.from('groups').select('*').in('id', ids).eq('is_deleted', false);
    res.json((groups || []).map(g => mapGroup(g)));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    await supabase.from('group_members').upsert({ group_id: req.params.groupId, user_id: userId, role: 'member' }, { onConflict: 'group_id,user_id' });
    res.json({ message: 'Member added' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.removeMember = async (req, res) => {
  try {
    const targetUser = req.params.userId === 'me' ? req.user.userId : req.params.userId;
    await supabase.from('group_members').delete().eq('group_id', req.params.groupId).eq('user_id', targetUser);
    res.json({ message: 'Member removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
