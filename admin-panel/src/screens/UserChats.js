import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaImage, FaVideo, FaMicrophone, FaMapMarkerAlt, FaFile } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';

const UserChats = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserChats = useCallback(async () => {
    try {
      const [messagesRes, userRes] = await Promise.all([
        api.get(`/admin/user-chats/${userId}`),
        api.get(`/users/profile`).catch(() => ({ data: null }))
      ]);

      setMessages(messagesRes.data);
      // Get user info from first message
      if (messagesRes.data.length > 0) {
        const firstMsg = messagesRes.data[0];
        const targetUser = firstMsg.sender._id === userId ? firstMsg.sender : firstMsg.receiver;
        setUserInfo(targetUser);
      }
    } catch (error) {
      toast.error('Failed to load user chats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserChats();
  }, [loadUserChats]);

  const getMessageIcon = (type) => {
    switch (type) {
      case 'image': return <FaImage className="text-pvchat-blue" />;
      case 'video': return <FaVideo className="text-purple-400" />;
      case 'audio': return <FaMicrophone className="text-green-400" />;
      case 'location': return <FaMapMarkerAlt className="text-red-400" />;
      default: return <FaFile className="text-pvchat-gray" />;
    }
  };

  const getOtherUser = (msg) => {
    return msg.sender._id === userId ? msg.receiver : msg.sender;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 text-pvchat-gray hover:text-white transition-all"
        >
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">User Chats</h1>
          {userInfo && (
            <div className="flex items-center gap-2 text-pvchat-gray">
              <FaUser className="text-xs" />
              <span className="text-sm">{userInfo.name} ({userInfo.phone})</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="admin-card text-center">
          <p className="text-2xl font-bold text-white">{messages.length}</p>
          <p className="text-xs text-pvchat-gray">Total Messages</p>
        </div>
        <div className="admin-card text-center">
          <p className="text-2xl font-bold text-pvchat-blue">
            {messages.filter(m => m.type === 'text').length}
          </p>
          <p className="text-xs text-pvchat-gray">Text</p>
        </div>
        <div className="admin-card text-center">
          <p className="text-2xl font-bold text-purple-400">
            {messages.filter(m => ['image', 'video'].includes(m.type)).length}
          </p>
          <p className="text-xs text-pvchat-gray">Media</p>
        </div>
        <div className="admin-card text-center">
          <p className="text-2xl font-bold text-green-400">
            {new Set(messages.map(m => getOtherUser(m)._id)).size}
          </p>
          <p className="text-xs text-pvchat-gray">Conversations</p>
        </div>
      </div>

      {/* Messages */}
      <div className="admin-card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Messages</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-pvchat-gray">No messages found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((msg, index) => {
              const otherUser = getOtherUser(msg);
              return (
                <div
                  key={msg._id || index}
                  className="bg-pvchat-dark rounded-xl p-4 hover:bg-pvchat-dark/80 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMessageIcon(msg.type)}
                      <div>
                        <span className="text-sm font-medium text-white">
                          {msg.sender._id === userId ? (
                            <span className="text-pvchat-blue">{msg.sender.name}</span>
                          ) : (
                            <span className="text-green-400">{msg.sender.name}</span>
                          )}
                        </span>
                        <span className="text-pvchat-gray mx-2">→</span>
                        <span className="text-sm text-pvchat-gray">
                          {otherUser.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-pvchat-gray">
                      {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                    </span>
                  </div>

                  <div className="ml-6">
                    {msg.type === 'image' && msg.mediaUrl && (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared"
                        className="max-w-xs rounded-lg mb-2"
                      />
                    )}
                    {msg.type === 'video' && msg.mediaUrl && (
                      <video controls className="max-w-xs rounded-lg mb-2">
                        <source src={msg.mediaUrl} />
                      </video>
                    )}
                    {msg.type === 'audio' && msg.mediaUrl && (
                      <audio controls className="max-w-xs">
                        <source src={msg.mediaUrl} />
                      </audio>
                    )}
                    {msg.type === 'location' && msg.location && (
                      <div className="bg-pvchat-card p-2 rounded-lg inline-flex items-center gap-2">
                        <FaMapMarkerAlt className="text-pvchat-danger" />
                        <span className="text-sm">
                          {msg.location.address || `${msg.location.latitude}, ${msg.location.longitude}`}
                        </span>
                      </div>
                    )}
                    {msg.type === 'text' && (
                      <p className="text-sm text-white">{msg.content}</p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-pvchat-gray">
                    <span>Type: {msg.type}</span>
                    <span>Status: {msg.isDeleted ? 'Deleted' : 'Active'}</span>
                    {msg.readBy?.length > 0 && (
                      <span className="text-green-400">
                        Read by {msg.readBy.length} user(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserChats;