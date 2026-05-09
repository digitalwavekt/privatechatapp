import React, { useState, useEffect, useMemo } from 'react';
import { FaPhone, FaVideo, FaPhoneSlash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

const normalizeArray = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const getId = (item) => item?._id || item?.id;
const getUserId = (user) => (typeof user === 'string' ? user : user?._id || user?.id);
const getUserName = (user) => (typeof user === 'object' && user ? user.name || user.email || 'Unknown User' : 'Unknown User');

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuthStore();

  const safeCalls = useMemo(() => normalizeArray(calls), [calls]);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/calls/history');
      setCalls(normalizeArray(data, 'calls'));
    } catch (error) {
      console.error('Load calls error:', error);
      toast.error(error.response?.data?.message || 'Failed to load call history');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const initiateCall = (type, userId) => {
    if (!userId) {
      toast.error('Invalid call user');
      return;
    }
    window.location.href = `/call/new?type=${type}&user=${userId}`;
  };

  const getCallIcon = (type, status) => {
    if (status === 'missed' || status === 'rejected') return <FaPhoneSlash className="text-pvchat-danger" />;
    if (type === 'video') return <FaVideo className="text-pvchat-blue" />;
    return <FaPhone className="text-pvchat-success" />;
  };

  const getCallStatus = (call) => {
    if (call?.status === 'missed') return 'Missed';
    if (call?.status === 'rejected') return 'Declined';
    if (call?.status === 'ended') return 'Ended';
    if (Number(call?.duration) > 0) {
      const duration = Number(call.duration);
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    }
    return call?.status || 'Connected';
  };

  const formatCallDate = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'MMM dd, HH:mm');
    } catch {
      return '';
    }
  };

  const getOtherUser = (call) => {
    const currentUserId = getUserId(user);
    const callerId = getUserId(call?.caller);
    const receiverId = getUserId(call?.receiver);

    if (currentUserId && callerId === currentUserId) return call?.receiver;
    if (currentUserId && receiverId === currentUserId) return call?.caller;

    return call?.receiver || call?.caller || null;
  };

  const isOutgoing = (call) => {
    const currentUserId = getUserId(user);
    return currentUserId && getUserId(call?.caller) === currentUserId;
  };

  const filteredCalls = activeTab === 'all'
    ? safeCalls
    : safeCalls.filter((call) => call?.type === activeTab);

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-white">Calls</h2>
        <div className="flex gap-2">
          {['all', 'audio', 'video'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm transition-all capitalize ${activeTab === tab ? 'bg-pvchat-blue text-white' : 'text-pvchat-gray hover:text-white'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaPhone className="text-4xl text-pvchat-gray mx-auto mb-4" />
              <p className="text-pvchat-gray">No calls yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCalls.map((call, index) => {
              const otherUser = getOtherUser(call);
              const otherUserId = getUserId(otherUser);
              const outgoing = isOutgoing(call);

              return (
                <div
                  key={getId(call) || index}
                  className="card p-4 flex items-center gap-4 hover:bg-pvchat-card/80 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-pvchat-dark flex items-center justify-center shrink-0">
                    {getCallIcon(call?.type, call?.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {getUserName(otherUser)}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-pvchat-gray flex-wrap">
                      {outgoing ? (
                        <FaArrowRight className="text-pvchat-success" />
                      ) : (
                        <FaArrowLeft className="text-pvchat-blue" />
                      )}
                      <span>{getCallStatus(call)}</span>
                      <span>•</span>
                      <span>{formatCallDate(call?.createdAt || call?.startedAt || call?.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => initiateCall('audio', otherUserId)}
                      className="p-2 text-pvchat-gray hover:text-pvchat-success transition-all"
                      title="Audio Call"
                    >
                      <FaPhone />
                    </button>
                    <button
                      onClick={() => initiateCall('video', otherUserId)}
                      className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                      title="Video Call"
                    >
                      <FaVideo />
                    </button>
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

export default Calls;
