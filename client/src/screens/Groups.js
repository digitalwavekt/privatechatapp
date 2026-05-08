import React, { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaCog, FaUserPlus, FaSignOutAlt } from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [groupMessages, setGroupMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data } = await api.get('/groups/my-groups');
      setGroups(data);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/groups/create', {
        ...newGroup,
        members: []
      });
      setGroups([...groups, data]);
      setShowCreate(false);
      setNewGroup({ name: '', description: '' });
      toast.success('Group created!');
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const loadGroupMessages = async (groupId) => {
    try {
      const { data } = await api.get(`/groups/messages/${groupId}`);
      setGroupMessages(data);
      setShowGroupChat(groupId);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const sendGroupMessage = async () => {
    if (!message.trim()) return;

    try {
      const { data } = await api.post('/groups/message', {
        groupId: showGroupChat,
        content: message
      });
      setGroupMessages([...groupMessages, data]);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      await api.delete(`/groups/${groupId}/members/me`);
      setGroups(groups.filter(g => g._id !== groupId));
      toast.success('Left group');
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  return (
    <div className="h-full flex">
      {/* Groups List */}
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
          ) : groups.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaUsers className="text-4xl text-pvchat-gray mx-auto mb-4" />
                <p className="text-pvchat-gray">No groups yet</p>
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group._id}
                onClick={() => loadGroupMessages(group._id)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-pvchat-card transition-all ${
                  showGroupChat === group._id ? 'bg-pvchat-card border-l-2 border-pvchat-blue' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center">
                  <FaUsers className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{group.name}</h4>
                  <p className="text-xs text-pvchat-gray">
                    {group.members.length} members
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Group Chat Area */}
      <div className="flex-1 flex flex-col bg-pvchat-black">
        {showGroupChat ? (
          <>
            {/* Group Header */}
            <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
                  <FaUsers className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">
                    {groups.find(g => g._id === showGroupChat)?.name}
                  </h4>
                  <p className="text-xs text-pvchat-gray">
                    {groups.find(g => g._id === showGroupChat)?.members.length} members
                  </p>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {groupMessages.map((msg, index) => (
                <div
                  key={msg._id || index}
                  className={`flex ${msg.sender._id === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                    msg.sender._id === 'me' 
                      ? 'bg-pvchat-blue text-white rounded-br-md' 
                      : 'bg-pvchat-card text-pvchat-white rounded-bl-md'
                  }`}>
                    <p className="text-xs text-pvchat-blue-light mb-1">{msg.sender.name}</p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-pvchat-dark border-t border-pvchat-gray-dark/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendGroupMessage()}
                  placeholder="Type a message..."
                  className="flex-1 input-field"
                />
                <button
                  onClick={sendGroupMessage}
                  className="p-3 bg-pvchat-blue rounded-xl text-white hover:bg-pvchat-blue-dark transition-all"
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

      {/* Create Group Modal */}
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
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
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