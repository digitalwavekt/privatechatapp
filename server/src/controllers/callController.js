const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { sendToUser } = require('../services/notificationService');

const getUserId = (req) => {
  return req.user?.userId || req.user?.id || req.user?._id;
};

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

async function getProfile(userId) {
  if (!userId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id,name,email,phone,status')
    .eq('id', userId)
    .maybeSingle();

  return data || null;
}

exports.initiateCall = async (req, res) => {
  try {
    const callerId = getUserId(req);
    const { receiverId, type = 'audio' } = req.body;

    if (!callerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'receiverId required'
      });
    }

    if (!['audio', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid call type'
      });
    }

    const receiver = await getProfile(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const caller = await getProfile(callerId);

    const channelName = `pvchat_${uuidv4()}`;
    const agoraToken = createAgoraToken(channelName);
    const appId = process.env.AGORA_APP_ID;

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        caller_id: callerId,
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
      callerId,
      receiverId,
      type,
      channelName,
      token: agoraToken,
      agoraToken,
      appId,
      caller: {
        _id: callerId,
        id: callerId,
        name: caller?.name || 'Someone',
        phone: caller?.phone || ''
      }
    };

    req.app.get('io')?.to(receiverId).emit('incomingCall', payload);

    try {
      await sendToUser(receiverId, {
        title: type === 'video' ? 'Incoming video call' : 'Incoming audio call',
        body: `${caller?.name || 'Someone'} is calling you`,
        data: {
          type: 'incoming_call',
          callId: String(call.id),
          callType: type,
          callerId: String(callerId),
          receiverId: String(receiverId),
          channelName,
          token: agoraToken,
          appId
        },
        channelId: 'pvchat_calls'
      });
    } catch (pushError) {
      console.error('Call push notification error:', pushError);
    }

    return res.status(201).json({
      success: true,
      ...payload
    });
  } catch (error) {
    console.error('initiateCall error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.acceptCall = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.callId)
      .single();

    if (error) throw error;

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (currentUserId && call.receiver_id !== currentUserId && call.caller_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to accept this call'
      });
    }

    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('id', req.params.callId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const payload = {
      callId: updatedCall.id,
      id: updatedCall.id,
      channelName: updatedCall.agora_channel,
      token: updatedCall.agora_token,
      agoraToken: updatedCall.agora_token,
      appId: process.env.AGORA_APP_ID,
      type: updatedCall.type
    };

    req.app.get('io')?.to(updatedCall.caller_id).emit('callAccepted', payload);

    return res.json({
      success: true,
      message: 'Call accepted',
      call: updatedCall,
      ...payload
    });
  } catch (error) {
    console.error('acceptCall error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.endCall = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    const { data: existing, error: findError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.callId)
      .single();

    if (findError) throw findError;

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (currentUserId && existing.receiver_id !== currentUserId && existing.caller_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to end this call'
      });
    }

    const endedAt = new Date();

    const duration = existing.started_at
      ? Math.max(0, Math.floor((endedAt - new Date(existing.started_at)) / 1000))
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

    const payload = {
      callId: call.id,
      id: call.id,
      duration
    };

    req.app.get('io')?.to(call.caller_id).emit('callEnded', payload);
    req.app.get('io')?.to(call.receiver_id).emit('callEnded', payload);

    return res.json({
      success: true,
      message: 'Call ended',
      call
    });
  } catch (error) {
    console.error('endCall error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.rejectCall = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    const { data: existing, error: findError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.callId)
      .single();

    if (findError) throw findError;

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (currentUserId && existing.receiver_id !== currentUserId && existing.caller_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to reject this call'
      });
    }

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

    const payload = {
      callId: call.id,
      id: call.id
    };

    req.app.get('io')?.to(call.caller_id).emit('callRejected', payload);

    return res.json({
      success: true,
      message: 'Call rejected',
      call
    });
  } catch (error) {
    console.error('rejectCall error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCallHistory = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const userIds = [
      ...new Set(
        (data || [])
          .flatMap((c) => [c.caller_id, c.receiver_id])
          .filter(Boolean)
      )
    ];

    const profilesMap = new Map();

    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,name,email,phone')
        .in('id', userIds);

      (profiles || []).forEach((profile) => {
        profilesMap.set(profile.id, profile);
      });
    }

    const calls = (data || []).map((c) => {
      const caller = profilesMap.get(c.caller_id);
      const receiver = profilesMap.get(c.receiver_id);

      return {
        _id: c.id,
        id: c.id,
        caller: {
          _id: c.caller_id,
          id: c.caller_id,
          name: c.caller_id === userId ? 'You' : caller?.name || 'Caller',
          phone: caller?.phone || ''
        },
        receiver: {
          _id: c.receiver_id,
          id: c.receiver_id,
          name: c.receiver_id === userId ? 'You' : receiver?.name || 'Receiver',
          phone: receiver?.phone || ''
        },
        type: c.type || 'audio',
        status: c.status || 'unknown',
        startedAt: c.started_at,
        createdAt: c.started_at,
        endedAt: c.ended_at,
        duration: c.duration || 0,
        agoraChannel: c.agora_channel,
        channelName: c.agora_channel,
        agoraToken: c.agora_token,
        token: c.agora_token
      };
    });

    return res.json({
      success: true,
      calls,
      data: calls
    });
  } catch (error) {
    console.error('getCallHistory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};