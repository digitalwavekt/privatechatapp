const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

function createAgoraToken(channelName) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) return '';
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  return RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, 0, RtcRole.PUBLISHER, privilegeExpiredTs);
}

exports.initiateCall = async (req, res) => {
  try {
    const { receiverId, type = 'audio' } = req.body;
    if (!receiverId) return res.status(400).json({ message: 'receiverId required' });
    const channelName = `pvchat_${uuidv4()}`;
    const agoraToken = createAgoraToken(channelName);
    const { data: call, error } = await supabase.from('calls').insert({ caller_id: req.user.userId, receiver_id: receiverId, type, status: 'ongoing', agora_channel: channelName, agora_token: agoraToken }).select('*').single();
    if (error) throw error;
    req.app.get('io').to(receiverId).emit('incomingCall', { callId: call.id, callerId: req.user.userId, type, channelName, agoraToken });
    res.status(201).json({ callId: call.id, channelName, agoraToken, appId: process.env.AGORA_APP_ID });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.acceptCall = async (req, res) => {
  try {
    const { data: call, error } = await supabase.from('calls').select('*').eq('id', req.params.callId).single();
    if (error) throw error;
    req.app.get('io').to(call.caller_id).emit('callAccepted', { callId: call.id });
    res.json({ message: 'Call accepted', call });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.endCall = async (req, res) => {
  try {
    const { data: existing } = await supabase.from('calls').select('*').eq('id', req.params.callId).single();
    const endedAt = new Date();
    const duration = existing?.started_at ? Math.floor((endedAt - new Date(existing.started_at)) / 1000) : 0;
    const { data: call, error } = await supabase.from('calls').update({ status: 'completed', ended_at: endedAt.toISOString(), duration }).eq('id', req.params.callId).select('*').single();
    if (error) throw error;
    req.app.get('io').to(call.caller_id).emit('callEnded', { callId: call.id });
    req.app.get('io').to(call.receiver_id).emit('callEnded', { callId: call.id });
    res.json({ message: 'Call ended', call });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.rejectCall = async (req, res) => {
  try {
    const { data: call, error } = await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', req.params.callId).select('*').single();
    if (error) throw error;
    req.app.get('io').to(call.caller_id).emit('callRejected', { callId: call.id });
    res.json({ message: 'Call rejected', call });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getCallHistory = async (req, res) => {
  try {
    const { data, error } = await supabase.from('calls').select('*').or(`caller_id.eq.${req.user.userId},receiver_id.eq.${req.user.userId}`).order('started_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json((data || []).map(c => ({ _id: c.id, id: c.id, caller: c.caller_id, receiver: c.receiver_id, type: c.type, status: c.status, startedAt: c.started_at, endedAt: c.ended_at, duration: c.duration, agoraChannel: c.agora_channel, agoraToken: c.agora_token })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};
