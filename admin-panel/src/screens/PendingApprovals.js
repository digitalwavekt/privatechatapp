import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaEnvelope, FaPhone, FaCamera } from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PendingApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const { data } = await api.get('/admin/pending-users');

      const usersList = Array.isArray(data)
        ? data
        : data.users || [];

      setPendingUsers(usersList);
    } catch (error) {
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      await api.post(`/admin/approve/${userId}`);
      toast.success('User approved successfully');
      setPendingUsers(pendingUsers.filter(u => u._id !== userId));
      setShowDetail(false);
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await api.post(`/admin/block/${userId}`, { reason: 'Rejected by admin' });
      toast.success('User rejected');
      setPendingUsers(pendingUsers.filter(u => u._id !== userId));
      setShowDetail(false);
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  const viewDetails = (user) => {
    setSelectedUser(user);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
        <div className="flex items-center gap-2">
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
            {pendingUsers.length} pending
          </span>
        </div>
      </div>

      {/* Pending Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="admin-card text-center py-12">
          <FaCheck className="text-4xl text-green-400 mx-auto mb-4" />
          <p className="text-pvchat-gray">No pending approvals</p>
          <p className="text-sm text-pvchat-gray-dark mt-2">All users have been reviewed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUsers.map((user) => (
            <div key={user._id} className="admin-card hover:border-pvchat-blue/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{user.name}</h3>
                    <p className="text-xs text-pvchat-gray">{user.email}</p>
                  </div>
                </div>
                <span className="status-pending">Pending</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-pvchat-gray">
                  <FaPhone className="text-xs" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-pvchat-gray">
                  <FaEnvelope className="text-xs" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-pvchat-gray">
                  <FaCamera className="text-xs" />
                  <span>{user.livePhoto ? 'Live photo captured' : 'No live photo'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => viewDetails(user)}
                  className="flex-1 py-2 rounded-lg bg-pvchat-dark text-pvchat-gray hover:text-white transition-all text-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      {showDetail && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-pvchat-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">User Details</h3>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-pvchat-gray hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Live Photo */}
              {selectedUser.livePhoto && (
                <div className="mb-6">
                  <label className="block text-sm text-pvchat-gray mb-2">Live Photo</label>
                  <div className="rounded-xl overflow-hidden bg-pvchat-dark">
                    <img
                      src={selectedUser.livePhoto}
                      alt="Live verification"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-pvchat-gray mb-1">Full Name</label>
                  <p className="text-white font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm text-pvchat-gray mb-1">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-pvchat-gray mb-1">Phone</label>
                  <p className="text-white">{selectedUser.phone}</p>
                </div>
                <div>
                  <label className="block text-sm text-pvchat-gray mb-1">Device Info</label>
                  <div className="bg-pvchat-dark rounded-lg p-3 text-sm text-pvchat-gray">
                    <p>Platform: {selectedUser.deviceInfo?.brand || 'Unknown'}</p>
                    <p>OS: {selectedUser.deviceInfo?.os || 'Unknown'}</p>
                    <p>Model: {selectedUser.deviceInfo?.model || 'Unknown'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-pvchat-gray mb-1">Registered</label>
                  <p className="text-white">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => rejectUser(selectedUser._id)}
                  className="flex-1 py-3 rounded-xl bg-pvchat-dark text-pvchat-danger hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Reject
                </button>
                <button
                  onClick={() => approveUser(selectedUser._id)}
                  className="flex-1 py-3 rounded-xl bg-pvchat-success text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;