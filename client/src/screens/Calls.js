import React, { useState, useEffect } from 'react';
import { FaPhone, FaVideo, FaPhoneSlash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      const { data } = await api.get('/calls/history');
      setCalls(data);
    } catch (error) {
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const initiateCall = (type, userId) => {
    window.location.href = `/call/new?type=${type}&user=${userId}`;
  };

  const getCallIcon = (type, status) => {
    if (status === 'missed') return <FaPhoneSlash className="text-pvchat-danger" />;
    if (type === 'video') return <FaVideo className="text-pvchat-blue" />;
    return <FaPhone className="text-pvchat-success" />;
  };

  const getCallStatus = (call) => {
    if (call.status === 'missed') return 'Missed';
    if (call.status === 'rejected') return 'Declined';
    if (call.duration > 0) return `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`;
    return 'Connected';
  };

  const filteredCalls = activeTab === 'all' 
    ? calls 
    : calls.filter(call => call.type === activeTab);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-white">Calls</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === 'all' ? 'bg-pvchat-blue text-white' : 'text-pvchat-gray hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === 'audio' ? 'bg-pvchat-blue text-white' : 'text-pvchat-gray hover:text-white'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === 'video' ? 'bg-pvchat-blue text-white' : 'text-pvchat-gray hover:text-white'
            }`}
          >
            Video
          </button>
        </div>
      </div>

      {/* Call List */}
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
            {filteredCalls.map((call) => (
              <div
                key={call._id}
                className="card p-4 flex items-center gap-4 hover:bg-pvchat-card/80 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-pvchat-dark flex items-center justify-center">
                  {getCallIcon(call.type, call.status)}
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    {call.caller._id === call.receiver._id ? call.receiver.name : call.caller.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-pvchat-gray">
                    {call.caller._id === call.receiver._id ? (
                      <FaArrowRight className="text-pvchat-success" />
                    ) : (
                      <FaArrowLeft className="text-pvchat-blue" />
                    )}
                    <span>{getCallStatus(call)}</span>
                    <span>•</span>
                    <span>{format(new Date(call.createdAt), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => initiateCall('audio', call.receiver._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-success transition-all"
                  >
                    <FaPhone />
                  </button>
                  <button
                    onClick={() => initiateCall('video', call.receiver._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                  >
                    <FaVideo />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calls;