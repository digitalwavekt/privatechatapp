const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

function createAgoraToken(channelName) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error('Agora env missing: AGORA_APP_ID or AGORA_APP_CERTIFICATE');
  }

  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    0,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );
}

exports.initiateCall = async (req, res) => {
  try {
    const { receiverId, type = 'audio' } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId required' });
    }

    const channelName = `pvchat_${uuidv4()}`;
    const agoraToken = createAgoraToken(channelName);

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        caller_id: req.user.userId,
        receiver_id: receiverId,
        type,
        status: 'ongoing',
        started_at: new Date().toISOString(),
        agora_channel: channelName,
        agora_token: agoraToken
      })
      .select('*')
      .single();

    if (error) throw error;

    const payload = {
      callId: call.id,
      id: call.id,
      callerId: req.user.userId,
      receiverId,
      type,
      channelName,
      token: agoraToken,
      agoraToken,
      appId: process.env.AGORA_APP_ID
    };

    req.app.get('io')?.to(receiverId).emit('incomingCall', payload);

    return res.status(201).json({
      success: true,
      ...payload
    });
  } catch (error) {
    console.error('initiateCall error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptCall = async (req, res) => {
  try {
    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.callId)
      .single();

    if (error) throw error;
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('id', req.params.callId);

    req.app.get('io')?.to(call.caller_id).emit('callAccepted', {
      callId: call.id,
      id: call.id,
      channelName: call.agora_channel,
      token: call.agora_token,
      agoraToken: call.agora_token,
      appId: process.env.AGORA_APP_ID
    });

    return res.json({
      success: true,
      message: 'Call accepted',
      call,
      channelName: call.agora_channel,
      token: call.agora_token,
      agoraToken: call.agora_token,
      appId: process.env.AGORA_APP_ID
    });
  } catch (error) {
    console.error('acceptCall error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.endCall = async (req, res) => {
  try {
    const { data: existing, error: findError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.callId)
      .single();

    if (findError) throw findError;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const endedAt = new Date();
    const duration = existing.started_at
      ? Math.floor((endedAt - new Date(existing.started_at)) / 1000)
      : 0;

    const { data: call, error } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        ended_at: endedAt.toISOString(),
        duration
      })
      .eq('id', req.params.callId)
      .select('*')
      .single();

    if (error) throw error;

    req.app.get('io')?.to(call.caller_id).emit('callEnded', { callId: call.id, id: call.id });
    req.app.get('io')?.to(call.receiver_id).emit('callEnded', { callId: call.id, id: call.id });

    return res.json({ success: true, message: 'Call ended', call });
  } catch (error) {
    console.error('endCall error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectCall = async (req, res) => {
  try {
    const { data: call, error } = await supabase
      .from('calls')
      .update({
        status: 'rejected',
        ended_at: new Date().toISOString()
      })
      .eq('id', req.params.callId)
      .select('*')
      .single();

    if (error) throw error;

    req.app.get('io')?.to(call.caller_id).emit('callRejected', {
      callId: call.id,
      id: call.id
    });

    return res.json({ success: true, message: 'Call rejected', call });
  } catch (error) {
    console.error('rejectCall error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const calls = (data || []).map((c) => ({
      _id: c.id,
      id: c.id,
      caller: {
        _id: c.caller_id,
        id: c.caller_id,
        name: c.caller_id === userId ? 'You' : 'Caller'
      },
      receiver: {
        _id: c.receiver_id,
        id: c.receiver_id,
        name: c.receiver_id === userId ? 'You' : 'Receiver'
      },
      type: c.type,
      status: c.status,
      startedAt: c.started_at,
      createdAt: c.started_at,
      endedAt: c.ended_at,
      duration: c.duration || 0,
      agoraChannel: c.agora_channel,
      channelName: c.agora_channel,
      agoraToken: c.agora_token,
      token: c.agora_token
    }));

    return res.json(calls);
  } catch (error) {
    console.error('getCallHistory error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};