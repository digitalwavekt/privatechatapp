import React, { useState, useEffect } from 'react';
import { FaHistory, FaUserCheck, FaUserSlash, FaTrash, FaShieldAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data } = await api.get('/admin/activities');
      setActivities(data);
    } catch (error) {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'approve_user': return <FaUserCheck className="text-green-400" />;
      case 'block_user': return <FaUserSlash className="text-red-400" />;
      case 'force_delete_app': return <FaTrash className="text-red-400" />;
      default: return <FaShieldAlt className="text-pvchat-blue" />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'approve_user': return 'Approved User';
      case 'block_user': return 'Blocked User';
      case 'force_delete_app': return 'Force Deleted App';
      default: return action.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase());
    }
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.action === filter);

  const actionTypes = ['all', 'approve_user', 'block_user', 'force_delete_app'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <div className="flex items-center gap-2">
          <FaHistory className="text-pvchat-gray" />
          <span className="text-pvchat-gray text-sm">{activities.length} total activities</span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card flex flex-wrap gap-2">
        {actionTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
              filter === type
                ? 'bg-pvchat-blue text-white'
                : 'bg-pvchat-dark text-pvchat-gray hover:text-white'
            }`}
          >
            {type === 'all' ? 'All Activities' : getActionLabel(type)}
          </button>
        ))}
      </div>

      {/* Activities List */}
      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <FaHistory className="text-4xl text-pvchat-gray mx-auto mb-4" />
            <p className="text-pvchat-gray">No activities found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredActivities.map((activity, index) => (
              <div 
                key={activity._id || index}
                className="bg-pvchat-dark rounded-xl p-4 hover:bg-pvchat-dark/80 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pvchat-card flex items-center justify-center flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-white">
                        {getActionLabel(activity.action)}
                      </h4>
                      <span className="text-xs text-pvchat-gray">
                        {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>

                    <div className="text-sm text-pvchat-gray space-y-1">
                      <p>
                        <span className="text-pvchat-blue">Admin:</span>{' '}
                        {activity.user?.name || 'Unknown'} ({activity.user?.email})
                      </p>
                      {activity.target && (
                        <p>
                          <span className="text-green-400">Target User:</span>{' '}
                          {activity.target?.name || 'Unknown'} ({activity.target?.email})
                        </p>
                      )}
                      {activity.details?.reason && (
                        <p>
                          <span className="text-pvchat-warning">Reason:</span>{' '}
                          {activity.details.reason}
                        </p>
                      )}
                      {activity.details?.userName && (
                        <p>
                          <span className="text-pvchat-gray-dark">User Name:</span>{' '}
                          {activity.details.userName}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-pvchat-gray-dark">
                      {activity.ipAddress && (
                        <span>IP: {activity.ipAddress}</span>
                      )}
                      {activity.userAgent && (
                        <span className="truncate max-w-[300px]">
                          Device: {activity.userAgent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;