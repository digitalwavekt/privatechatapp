import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../context/authStore';
import { useChatStore } from '../context/chatStore';
import toast from 'react-hot-toast';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const { logout, user } = useAuthStore();
  const { addMessage, setTyping, setOnlineStatus } = useChatStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('newMessage', (message) => {
      addMessage(message);

      // Show notification if not active chat
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(`New message from ${message.sender.name}`, {
          body: message.content,
          icon: '/logo192.png'
        });
      }
    });

    socket.on('userTyping', (data) => {
      setTyping(data.userId, data.isTyping);
    });

    socket.on('userOnline', (data) => {
      setOnlineStatus(data.userId, true);
    });

    socket.on('userOffline', (data) => {
      setOnlineStatus(data.userId, false);
    });

    socket.on('forceLogout', (data) => {
      toast.error(`You have been logged out. Reason: ${data.reason}`);
      logout();
      window.location.href = '/login';
    });

    socket.on('forceDelete', (data) => {
      toast.error(`App access revoked. Reason: ${data.reason}`);
      logout();
      // Clear all app data
      localStorage.clear();
      indexedDB.deleteDatabase('pvchat-db');
      window.location.href = '/deleted';
    });

    socket.on('incomingCall', (data) => {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Incoming {data.type} call from {data.caller.name}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.href = `/call/${data.callId}?type=${data.type}&channel=${data.channelName}&token=${data.token}&caller=${data.caller._id}`;
                toast.dismiss(t.id);
              }}
              className="bg-green-500 text-white px-4 py-2 rounded-lg"
            >
              Answer
            </button>
            <button
              onClick={() => {
                socket.emit('rejectCall', { callId: data.callId });
                toast.dismiss(t.id);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Decline
            </button>
          </div>
        </div>
      ), { duration: 30000 });
    });

    socket.on('callEnded', () => {
      toast('Call ended');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, logout, addMessage, setTyping, setOnlineStatus]);

  return socketRef.current;
};