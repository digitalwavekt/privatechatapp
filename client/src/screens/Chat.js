import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaPaperPlane,
  FaPhone,
  FaVideo,
  FaImage,
  FaMapMarkerAlt,
  FaSmile,
  FaCheck,
  FaCheckDouble,
  FaComments
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { format } from 'date-fns';
import { useChatStore } from '../context/chatStore';
import { useAuthStore } from '../context/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { user } = useAuthStore();

  const {
    conversations,
    activeChat,
    messages,
    setActiveChat,
    addMessage,
    setMessages,
    typingUsers
  } = useChatStore();

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeTypingUsers =
    typingUsers && typeof typingUsers === 'object' ? typingUsers : {};

  const targetUserId = searchParams.get('user');

  useEffect(() => {
    loadConversations();

    if (targetUserId) {
      loadChat(targetUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [safeMessages]);

  const normalizeArray = (data, key) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      const conversationsData = normalizeArray(data, 'conversations');
      useChatStore.getState().setConversations(conversationsData);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadChat = async (userId) => {
    try {
      const convUser = safeConversations.find(
        (c) => c?._id === userId || c?.user?._id === userId
      );

      setActiveChat(convUser?.user || convUser || { _id: userId });

      const { data } = await api.get(`/chat/messages/${userId}`);
      const messagesData = normalizeArray(data, 'messages');

      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load chat:', error);
      toast.error('Failed to load chat');
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!activeChat?._id) return;

    setLoading(true);

    try {
      let mediaUrl = '';

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const { data } = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        mediaUrl = data?.url || data?.mediaUrl || '';
      }

      const { data } = await api.post('/chat/send', {
        receiverId: activeChat._id,
        content: message || (selectedFile ? 'Sent a file' : ''),
        type: selectedFile ? 'image' : 'text',
        mediaUrl
      });

      const newMessage = data?.message || data?.data || data;

      if (newMessage) {
        addMessage(newMessage);
      }

      setMessage('');
      setSelectedFile(null);
      setShowAttachment(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + (emojiData?.emoji || ''));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const initiateCall = (type) => {
    if (!activeChat?._id) return;
    window.location.href = `/call/new?type=${type}&user=${activeChat._id}`;
  };

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-80 bg-pvchat-dark border-r border-pvchat-gray-dark/30 flex flex-col">
        <div className="p-4 border-b border-pvchat-gray-dark/30">
          <h3 className="text-lg font-semibold text-white">Messages</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {safeConversations.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <p className="text-pvchat-gray text-sm">No conversations yet</p>
            </div>
          ) : (
            safeConversations.map((conv, index) => {
              const convUser = conv?.user || conv;
              const convId = conv?._id || convUser?._id || index;

              return (
                <div
                  key={convId}
                  onClick={() => loadChat(convUser?._id || conv?._id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-pvchat-card transition-all ${activeChat?._id === convUser?._id
                      ? 'bg-pvchat-card border-l-2 border-pvchat-blue'
                      : ''
                    }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {(convUser?.name || convUser?.email || 'U')
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    </div>

                    {convUser?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-pvchat-dark" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {convUser?.name || convUser?.email || 'Unknown User'}
                    </h4>
                    <p className="text-xs text-pvchat-gray truncate">
                      {conv?.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  <span className="text-xs text-pvchat-gray">
                    {formatTime(conv?.lastMessage?.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-pvchat-black">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {(activeChat?.name || activeChat?.email || 'U')
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  </div>

                  {activeChat?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-pvchat-dark" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white">
                    {activeChat?.name || activeChat?.email || 'Unknown User'}
                  </h4>
                  <p className="text-xs text-pvchat-gray">
                    {safeTypingUsers[activeChat?._id]
                      ? 'typing...'
                      : activeChat?.isOnline
                        ? 'Online'
                        : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => initiateCall('audio')}
                  className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                >
                  <FaPhone />
                </button>

                <button
                  onClick={() => initiateCall('video')}
                  className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                >
                  <FaVideo />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {safeMessages.map((msg, index) => {
                const senderId =
                  typeof msg?.sender === 'string'
                    ? msg.sender
                    : msg?.sender?._id;

                const isMine = senderId === user?._id;

                return (
                  <div
                    key={msg?._id || index}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`chat-bubble ${isMine ? 'chat-bubble-sent' : 'chat-bubble-received'
                        }`}
                    >
                      {msg?.type === 'image' && msg?.mediaUrl && (
                        <img
                          src={msg.mediaUrl}
                          alt="Shared"
                          className="max-w-xs rounded-lg mb-2"
                        />
                      )}

                      {msg?.type === 'audio' && msg?.mediaUrl && (
                        <audio controls className="max-w-xs">
                          <source src={msg.mediaUrl} />
                        </audio>
                      )}

                      {msg?.type === 'video' && msg?.mediaUrl && (
                        <video controls className="max-w-xs rounded-lg">
                          <source src={msg.mediaUrl} />
                        </video>
                      )}

                      {msg?.type === 'location' && msg?.location && (
                        <div className="bg-pvchat-dark p-2 rounded-lg">
                          <FaMapMarkerAlt className="text-pvchat-blue mb-1" />
                          <p className="text-xs">
                            {msg.location.address ||
                              `${msg.location.latitude}, ${msg.location.longitude}`}
                          </p>
                        </div>
                      )}

                      <p>{msg?.content || ''}</p>

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">
                          {formatTime(msg?.createdAt)}
                        </span>

                        {isMine &&
                          (Array.isArray(msg?.readBy) && msg.readBy.length > 0 ? (
                            <FaCheckDouble className="text-xs text-blue-300" />
                          ) : (
                            <FaCheck className="text-xs opacity-70" />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-pvchat-dark border-t border-pvchat-gray-dark/30">
              {selectedFile && (
                <div className="mb-2 p-2 bg-pvchat-card rounded-lg flex items-center justify-between">
                  <span className="text-sm text-pvchat-gray">
                    {selectedFile.name}
                  </span>

                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-pvchat-danger text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAttachment(!showAttachment)}
                  className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                >
                  <FaImage />
                </button>

                {showAttachment && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-pvchat-card rounded-xl p-2 shadow-lg border border-pvchat-gray-dark/30">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,audio/*"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-pvchat-gray hover:text-pvchat-blue"
                    >
                      <FaImage className="text-xl" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                >
                  <FaSmile />
                </button>

                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 input-field"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={loading || (!message.trim() && !selectedFile)}
                  className="p-3 bg-pvchat-blue rounded-xl text-white hover:bg-pvchat-blue-dark transition-all disabled:opacity-50"
                >
                  <FaPaperPlane />
                </button>
              </div>

              {showEmoji && (
                <div className="absolute bottom-20 right-4">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-pvchat-card rounded-full mx-auto mb-4 flex items-center justify-center">
                <FaComments className="text-3xl text-pvchat-gray" />
              </div>

              <p className="text-pvchat-gray">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;