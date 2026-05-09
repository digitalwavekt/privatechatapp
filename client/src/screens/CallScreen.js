import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash
} from 'react-icons/fa';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../utils/api';
import toast from 'react-hot-toast';

const normalizeCallPayload = (data) => {
  const payload = data?.call || data?.data || data || {};
  return {
    callId: payload?._id || payload?.id || payload?.callId,
    appId: payload?.appId || payload?.agoraAppId || data?.appId || data?.agoraAppId || process.env.REACT_APP_AGORA_APP_ID,
    channelName: payload?.channelName || payload?.channel || data?.channelName || data?.channel,
    token: payload?.token || payload?.agoraToken || data?.token || data?.agoraToken,
    uid: payload?.uid || data?.uid || null,
    type: payload?.type || data?.type
  };
};

const getMediaErrorMessage = (error, callType) => {
  const name = error?.name || '';
  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();

  if (name === 'NotAllowedError' || lowerMessage.includes('permission') || lowerMessage.includes('permission_denied')) {
    return `${callType === 'video' ? 'Camera/Microphone' : 'Microphone'} permission denied. Allow permission from Android app settings and try again.`;
  }

  if (name === 'NotReadableError' || lowerMessage.includes('not_readable') || lowerMessage.includes('could not start')) {
    return `${callType === 'video' ? 'Camera/Microphone' : 'Microphone'} is busy or unavailable. Close other apps using it and retry.`;
  }

  if (name === 'NotFoundError' || lowerMessage.includes('not found')) {
    return `${callType === 'video' ? 'Camera/Microphone' : 'Microphone'} device not found.`;
  }

  return `Unable to access ${callType === 'video' ? 'camera/microphone' : 'microphone'}.`;
};

const CallScreen = () => {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('connecting');
  const [callError, setCallError] = useState('');
  const [activeCallId, setActiveCallId] = useState(callId === 'new' ? null : callId);

  const localVideoRef = useRef(null);
  const agoraClient = useRef(null);
  const timerRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  const type = searchParams.get('type') === 'video' ? 'video' : 'audio';
  const channelName = searchParams.get('channel');
  const token = searchParams.get('token');
  const targetUserId = searchParams.get('user');

  const cleanupTracks = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      setLocalAudioTrack(null);
      setLocalVideoTrack(null);
    } catch (error) {
      console.error('Track cleanup error:', error);
    }
  }, []);

  const endCallCleanup = useCallback(async () => {
    clearInterval(timerRef.current);
    timerRef.current = null;

    await cleanupTracks();

    try {
      if (agoraClient.current) {
        agoraClient.current.removeAllListeners();
        await agoraClient.current.leave();
        agoraClient.current = null;
      }
    } catch (error) {
      console.error('Agora leave error:', error);
    }

    setRemoteUsers([]);
  }, [cleanupTracks]);

  const setupAgoraEvents = useCallback((client) => {
    client.on('user-published', async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);

        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }

        if (mediaType === 'video') {
          setRemoteUsers((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const exists = safePrev.some((u) => u?.uid === user?.uid);
            return exists ? safePrev : [...safePrev, user];
          });

          setTimeout(() => {
            const element = document.getElementById(`remote-video-${user.uid}`);
            if (element && user.videoTrack) user.videoTrack.play(element);
          }, 250);
        }
      } catch (error) {
        console.error('Subscribe remote user error:', error);
      }
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        setRemoteUsers((prev) => (Array.isArray(prev) ? prev : []).filter((u) => u?.uid !== user?.uid));
      }
    });

    client.on('user-left', (user) => {
      setRemoteUsers((prev) => (Array.isArray(prev) ? prev : []).filter((u) => u?.uid !== user?.uid));
      toast('User left the call');
    });

    client.on('connection-state-change', (curState) => {
      console.log('Agora connection state:', curState);
      if (curState === 'DISCONNECTED') setCallStatus('ended');
    });
  }, []);

  const requestBrowserMediaPermission = async (callType) => {
    if (!navigator?.mediaDevices?.getUserMedia) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
    });

    stream.getTracks().forEach((track) => track.stop());
  };

  const createAndPublishTracks = useCallback(async (client, callType) => {
    try {
      await requestBrowserMediaPermission(callType);

      if (callType === 'audio') {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard'
        });

        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        await client.publish([audioTrack]);
        return;
      }

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'music_standard' },
        { encoderConfig: '480p_1', facingMode: 'user' }
      );

      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.publish([audioTrack, videoTrack]);
    } catch (error) {
      console.error('Create/publish tracks error:', error);
      throw new Error(getMediaErrorMessage(error, callType));
    }
  }, []);

  const initializeCall = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      setCallStatus('connecting');
      setCallError('');

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClient.current = client;
      setupAgoraEvents(client);

      let callPayload;

      if (callId === 'new' && targetUserId) {
        const { data } = await api.post('/calls/initiate', {
          receiverId: targetUserId,
          type
        });
        callPayload = normalizeCallPayload(data);
        if (callPayload.callId) setActiveCallId(callPayload.callId);
      } else {
        callPayload = {
          callId,
          appId: searchParams.get('appId') || process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token,
          uid: searchParams.get('uid') || null,
          type
        };
      }

      if (!callPayload.appId || !callPayload.channelName || !callPayload.token) {
        throw new Error('Missing Agora appId/channel/token');
      }

      await client.join(
        callPayload.appId,
        callPayload.channelName,
        callPayload.token,
        callPayload.uid || null
      );

      if (callId !== 'new') {
        try {
          await api.post(`/calls/accept/${callId}`);
        } catch (error) {
          console.warn('Accept call API failed, continuing Agora call:', error);
        }
      }

      await createAndPublishTracks(client, type);

      if (mountedRef.current) {
        setCallStatus('connected');
        toast.success('Call connected');
      }
    } catch (error) {
      console.error('Call initialize error:', error);
      const message = error?.message || 'Failed to start call';
      setCallError(message);
      setCallStatus('failed');
      toast.error(message);
      await endCallCleanup();
    }
  }, [callId, targetUserId, type, searchParams, channelName, token, setupAgoraEvents, createAndPublishTracks, endCallCleanup]);

  useEffect(() => {
    mountedRef.current = true;
    initializeCall();

    return () => {
      mountedRef.current = false;
      endCallCleanup();
    };
  }, [initializeCall, endCallCleanup]);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [callStatus]);

  useEffect(() => {
    if (type === 'video' && localVideoTrackRef.current && localVideoRef.current && !isVideoOff) {
      localVideoTrackRef.current.play(localVideoRef.current);
    }
  }, [type, localVideoTrack, isVideoOff]);

  const toggleMute = async () => {
    try {
      if (!localAudioTrackRef.current) return;
      const nextMuted = !isMuted;
      await localAudioTrackRef.current.setEnabled(!nextMuted);
      setIsMuted(nextMuted);
    } catch (error) {
      console.error('Toggle mute error:', error);
      toast.error('Unable to toggle microphone');
    }
  };

  const toggleVideo = async () => {
    try {
      if (!localVideoTrackRef.current) return;
      const nextVideoOff = !isVideoOff;
      await localVideoTrackRef.current.setEnabled(!nextVideoOff);
      setIsVideoOff(nextVideoOff);
    } catch (error) {
      console.error('Toggle video error:', error);
      toast.error('Unable to toggle camera');
    }
  };

  const endCall = async () => {
    try {
      const idToEnd = activeCallId || callId;
      if (idToEnd && idToEnd !== 'new') {
        await api.post(`/calls/end/${idToEnd}`);
      }
    } catch (error) {
      console.error('End call API error:', error);
    } finally {
      await endCallCleanup();
      navigate('/calls');
    }
  };

  const rejectOrBack = async () => {
    try {
      const idToReject = activeCallId || callId;
      if (idToReject && idToReject !== 'new') {
        await api.post(`/calls/reject/${idToReject}`);
      }
    } catch (error) {
      console.error('Reject call API error:', error);
    } finally {
      await endCallCleanup();
      navigate('/calls');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const safeRemoteUsers = Array.isArray(remoteUsers) ? remoteUsers : [];

  return (
    <div className="h-screen bg-pvchat-black flex flex-col">
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
            {type === 'video' ? <FaVideo className="text-white" /> : <FaPhone className="text-white" />}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">
              {type === 'video' ? 'Video Call' : 'Audio Call'}
            </h4>
            <p className="text-xs text-pvchat-gray">
              {callStatus === 'connecting'
                ? 'Connecting...'
                : callStatus === 'failed'
                  ? 'Call failed'
                  : callStatus === 'ended'
                    ? 'Call ended'
                    : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-pvchat-dark">
        {callError ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-pvchat-card rounded-full mx-auto mb-4 flex items-center justify-center">
                <FaPhoneSlash className="text-4xl text-pvchat-danger" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Call Failed</h3>
              <p className="text-pvchat-gray mb-6">{callError}</p>
              <button onClick={rejectOrBack} className="btn-primary px-6 py-3">
                Back to Calls
              </button>
            </div>
          </div>
        ) : type === 'video' ? (
          <>
            <div className="w-full h-full">
              {safeRemoteUsers.map((remoteUser) => (
                <div
                  key={remoteUser?.uid}
                  id={`remote-video-${remoteUser?.uid}`}
                  className="w-full h-full"
                />
              ))}

              {safeRemoteUsers.length === 0 && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-pvchat-card rounded-full mx-auto mb-4 flex items-center justify-center">
                      <FaVideo className="text-4xl text-pvchat-gray" />
                    </div>
                    <p className="text-pvchat-gray">Waiting for other participant...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 right-4 w-48 h-36 bg-pvchat-black rounded-xl overflow-hidden border-2 border-pvchat-gray-dark/30">
              <div ref={localVideoRef} className="w-full h-full" />
              {isVideoOff && (
                <div className="absolute inset-0 bg-pvchat-card flex items-center justify-center">
                  <FaVideoSlash className="text-2xl text-pvchat-gray" />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-pvchat-card rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse-slow">
                <FaPhone className="text-5xl text-pvchat-blue" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Audio Call</h3>
              <p className="text-pvchat-gray">
                {callStatus === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="h-20 bg-pvchat-dark border-t border-pvchat-gray-dark/30 flex items-center justify-center gap-6">
        <button
          onClick={toggleMute}
          disabled={!localAudioTrack}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
            isMuted ? 'bg-pvchat-danger text-white' : 'bg-pvchat-card text-pvchat-gray hover:text-white'
          }`}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>

        {type === 'video' && (
          <button
            onClick={toggleVideo}
            disabled={!localVideoTrack}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
              isVideoOff ? 'bg-pvchat-danger text-white' : 'bg-pvchat-card text-pvchat-gray hover:text-white'
            }`}
          >
            {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
          </button>
        )}

        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-pvchat-danger text-white flex items-center justify-center hover:bg-red-600 transition-all"
        >
          <FaPhoneSlash className="text-xl" />
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
