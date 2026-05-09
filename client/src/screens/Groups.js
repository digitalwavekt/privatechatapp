import React, { useState, useEffect, useMemo } from 'react';
import { FaUsers, FaPlus, FaCog, FaUserPlus, FaSignOutAlt } from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

const normalizeArray = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeObject = (data, key) => {
  if (!data) return null;
  if (data?.[key] && typeof data[key] === 'object') return data[key];
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  if (typeof data === 'object' && !Array.isArray(data)) return data;
  return null;
};

const getId = (item) => item?._id || item?.id;
const getSender = (msg) => (typeof msg?.sender === 'object' && msg.sender ? msg.sender : {});

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [groupMessages, setGroupMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const safeGroups = useMemo(() => normalizeArray(groups), [groups]);
  const safeGroupMessages = useMemo(() => normalizeArray(groupMessages), [groupMessages]);
  const activeGroup = safeGroups.find((g) => getId(g) === showGroupChat) || null;
  const activeMembers = normalizeArray(activeGroup?.members);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/groups/my-groups');
      setGroups(normalizeArray(data, 'groups'));
    } catch (error) {
      console.error('Load groups error:', error);
      toast.error(error.response?.data?.message || 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const { data } = await api.post('/groups/create', {
        ...newGroup,
        members: []
      });

      const createdGroup = normalizeObject(data, 'group') || data;
      setGroups((prev) => [...normalizeArray(prev), createdGroup]);
      setShowCreate(false);
      setNewGroup({ name: '', description: '' });
      toast.success('Group created!');
    } catch (error) {
      console.error('Create group error:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const loadGroupMessages = async (groupId) => {
    if (!groupId) return;

    try {
      setMessagesLoading(true);
      setShowGroupChat(groupId);
      const { data } = await api.get(`/groups/messages/${groupId}`);
      setGroupMessages(normalizeArray(data, 'messages'));
    } catch (error) {
      console.error('Load group messages error:', error);
      toast.error(error.response?.data?.message || 'Failed to load messages');
      setGroupMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendGroupMessage = async () => {
    const content = message.trim();
    if (!content || !showGroupChat) return;

    try {
      const { data } = await api.post('/groups/message', {
        groupId: showGroupChat,
        content
      });

      const newMessage = normalizeObject(data, 'message') || data;
      setGroupMessages((prev) => [...normalizeArray(prev), newMessage]);
      setMessage('');
    } catch (error) {
      console.error('Send group message error:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const leaveGroup = async (groupId) => {
    if (!groupId) return;

    try {
      await api.delete(`/groups/${groupId}/members/me`);
      setGroups((prev) => normalizeArray(prev).filter((g) => getId(g) !== groupId));
      setGroupMessages([]);
      setShowGroupChat(null);
      toast.success('Left group');
    } catch (error) {
      console.error('Leave group error:', error);
      toast.error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  return (
    <div className="h-full flex">
      <div className="w-80 bg-pvchat-dark border-r border-pvchat-gray-dark/30 flex flex-col">
        <div className="p-4 border-b border-pvchat-gray-dark/30 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Groups</h3>
          <button
            onClick={() => setShowCreate(true)}
            className="p-2 bg-pvchat-blue rounded-lg text-white hover:bg-pvchat-blue-dark transition-all"
          >
            <FaPlus />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
            </div>
          ) : safeGroups.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaUsers className="text-4xl text-pvchat-gray mx-auto mb-4" />
                <p className="text-pvchat-gray">No groups yet</p>
              </div>
            </div>
          ) : (
            safeGroups.map((group, index) => {
              const groupId = getId(group) || index;
              const members = normalizeArray(group?.members);

              return (
                <div
                  key={groupId}
                  onClick={() => loadGroupMessages(getId(group))}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-pvchat-card transition-all ${
                    showGroupChat === getId(group) ? 'bg-pvchat-card border-l-2 border-pvchat-blue' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center shrink-0">
                    <FaUsers className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{group?.name || 'Untitled Group'}</h4>
                    <p className="text-xs text-pvchat-gray">{members.length} members</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-pvchat-black">
        {showGroupChat ? (
          <>
            <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center shrink-0">
                  <FaUsers className="text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">
                    {activeGroup?.name || 'Group Chat'}
                  </h4>
                  <p className="text-xs text-pvchat-gray">{activeMembers.length} members</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all">
                  <FaUserPlus />
                </button>
                <button className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all">
                  <FaCog />
                </button>
                <button
                  onClick={() => leaveGroup(showGroupChat)}
                  className="p-2 text-pvchat-gray hover:text-pvchat-danger transition-all"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
                </div>
              ) : safeGroupMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-pvchat-gray">No messages yet</p>
                </div>
              ) : (
                safeGroupMessages.map((msg, index) => {
                  const sender = getSender(msg);
                  const senderId = typeof msg?.sender === 'string' ? msg.sender : sender?._id;
                  const isMine = msg?.isMine || senderId === 'me';

                  return (
                    <div
                      key={getId(msg) || index}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-pvchat-blue text-white rounded-br-md'
                          : 'bg-pvchat-card text-pvchat-white rounded-bl-md'
                      }`}
                      >
                        {!isMine && (
                          <p className="text-xs text-pvchat-blue-light mb-1">
                            {sender?.name || 'Unknown User'}
                          </p>
                        )}
                        <p>{msg?.content || ''}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-pvchat-dark border-t border-pvchat-gray-dark/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendGroupMessage()}
                  placeholder="Type a message..."
                  className="flex-1 input-field"
                />
                <button
                  onClick={sendGroupMessage}
                  disabled={!message.trim()}
                  className="p-3 bg-pvchat-blue rounded-xl text-white hover:bg-pvchat-blue-dark transition-all disabled:opacity-50"
                >
                  <FaPlus className="rotate-45" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaUsers className="text-4xl text-pvchat-gray mx-auto mb-4" />
              <p className="text-pvchat-gray">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-pvchat-card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Group</h3>
            <form onSubmit={createGroup} className="space-y-4">
              <input
                type="text"
                placeholder="Group Name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="input-field"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="input-field h-24 resize-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl bg-pvchat-dark text-white hover:bg-pvchat-gray-dark transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
