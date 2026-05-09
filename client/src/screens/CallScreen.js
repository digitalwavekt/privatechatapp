import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../utils/api';
import toast from 'react-hot-toast';

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

  const localVideoRef = useRef(null);
  const agoraClient = useRef(null);
  const timerRef = useRef(null);

  const type = searchParams.get('type') || 'audio';
  const channelName = searchParams.get('channel');
  const token = searchParams.get('token');
  const targetUserId = searchParams.get('user');

  useEffect(() => {
    initializeCall();
    return () => {
      endCallCleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClient.current = client;

      // If initiating new call
      if (callId === 'new' && targetUserId) {
        const { data } = await api.post('/calls/initiate', {
          receiverId: targetUserId,
          type
        });

        // Join channel with returned token
        const appId = data.appId;
        const channel = data.channelName;
        const agoraToken = data.token || data.agoraToken;

        if (!appId || !channel || !agoraToken) {
          throw new Error('Missing Agora appId/channel/token');
        }

        await client.join(appId, channel, agoraToken, null);
      } else {
        // Join existing call
        const appId = searchParams.get('appId') || process.env.REACT_APP_AGORA_APP_ID;

        if (!appId || !channelName || !token) {
          throw new Error('Missing Agora appId/channel/token');
        }

        await client.join(appId, channelName, token, null);
        await api.post(`/calls/accept/${callId}`);
      }

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (type === 'video' && localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.publish([audioTrack, videoTrack]);
      setCallStatus('connected');

      // Handle remote users
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);

        if (mediaType === 'video') {
          setRemoteUsers(prev => [...prev, user]);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      });

    } catch (error) {
      console.error('Call error:', error);
      toast.error('Failed to start call');
      navigate('/calls');
    }
  };

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = async () => {
    try {
      if (callId !== 'new') {
        await api.post(`/calls/end/${callId}`);
      }
    } catch (error) {
      console.error('End call error:', error);
    }
    endCallCleanup();
    navigate('/calls');
  };

  const endCallCleanup = () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    agoraClient.current?.leave();
    clearInterval(timerRef.current);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-pvchat-black flex flex-col">
      {/* Call Header */}
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
            <FaPhone className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">
              {type === 'video' ? 'Video Call' : 'Audio Call'}
            </h4>
            <p className="text-xs text-pvchat-gray">
              {callStatus === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-pvchat-dark">
        {type === 'video' ? (
          <>
            {/* Remote Video */}
            <div className="w-full h-full">
              {remoteUsers.map(user => (
                <div key={user.uid} className="w-full h-full">
                  <video
                    ref={ref => user.videoTrack?.play(ref)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {remoteUsers.length === 0 && (
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

            {/* Local Video */}
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
              <p className="text-pvchat-gray">{formatDuration(callDuration)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="h-20 bg-pvchat-dark border-t border-pvchat-gray-dark/30 flex items-center justify-center gap-6">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-pvchat-danger text-white' : 'bg-pvchat-card text-pvchat-gray hover:text-white'
            }`}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>

        {type === 'video' && (
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-pvchat-danger text-white' : 'bg-pvchat-card text-pvchat-gray hover:text-white'
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