import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaBan, FaTrash, FaCheck, FaPhone, FaEnvelope, FaComments } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  const loadUsers = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const { data } = await api.get('/admin/users', { params });
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const blockUser = async () => {
    try {
      await api.post(`/admin/block/${selectedUser}`, { reason: blockReason });
      toast.success('User blocked successfully');
      setShowBlockModal(false);
      setBlockReason('');
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const forceDelete = async () => {
    try {
      await api.post(`/admin/force-delete/${selectedUser}`, { reason: deleteReason });
      toast.success('Force delete command sent to device');
      setShowDeleteModal(false);
      setDeleteReason('');
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete app');
    }
  };

  const viewChats = (userId) => {
    navigate(`/chats/${userId}`);
  };

  const openBlockModal = (userId) => {
    setSelectedUser(userId);
    setShowBlockModal(true);
  };

  const openDeleteModal = (userId) => {
    setSelectedUser(userId);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Users</h1>
        <div className="flex items-center gap-2">
          <span className="text-pvchat-gray text-sm">Total: {users.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card flex flex-wrap gap-4 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-[300px] flex gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <button type="submit" className="admin-btn-primary">
            Search
          </button>
        </form>

        <div className="flex gap-2">
          {['all', 'approved', 'pending', 'blocked', 'deleted'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                statusFilter === status
                  ? 'bg-pvchat-blue text-white'
                  : 'bg-pvchat-dark text-pvchat-gray hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <FaUsers className="text-4xl text-pvchat-gray mx-auto mb-4" />
            <p className="text-pvchat-gray">No users found</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Online</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-pvchat-gray">{user.role}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <FaEnvelope className="text-pvchat-gray text-xs" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FaPhone className="text-pvchat-gray text-xs" />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-sm">{user.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </td>
                  <td className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewChats(user._id)}
                        className="p-2 text-pvchat-blue hover:bg-pvchat-blue/10 rounded-lg transition-all"
                        title="View Chats"
                      >
                        <FaComments />
                      </button>
                      {user.status !== 'blocked' && user.status !== 'deleted' && (
                        <button
                          onClick={() => openBlockModal(user._id)}
                          className="p-2 text-pvchat-warning hover:bg-yellow-500/10 rounded-lg transition-all"
                          title="Block User"
                        >
                          <FaBan />
                        </button>
                      )}
                      {user.status !== 'deleted' && (
                        <button
                          onClick={() => openDeleteModal(user._id)}
                          className="p-2 text-pvchat-danger hover:bg-red-500/10 rounded-lg transition-all"
                          title="Force Delete App"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-pvchat-card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Block User</h3>
            <p className="text-pvchat-gray mb-4">This will block the user and force logout from all devices.</p>
            <textarea
              placeholder="Reason for blocking..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="admin-input h-24 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBlockModal(false); setBlockReason(''); }}
                className="flex-1 py-3 rounded-xl bg-pvchat-dark text-white hover:bg-pvchat-gray-dark transition-all"
              >
                Cancel
              </button>
              <button
                onClick={blockUser}
                className="flex-1 admin-btn-danger py-3"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-pvchat-card rounded-2xl p-6 w-full max-w-md mx-4 border border-pvchat-danger/30">
            <h3 className="text-xl font-semibold text-pvchat-danger mb-4">Force Delete App</h3>
            <p className="text-pvchat-gray mb-4">
              This will send a command to delete the app from the user's device. This action cannot be undone.
            </p>
            <textarea
              placeholder="Reason for deletion..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="admin-input h-24 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteReason(''); }}
                className="flex-1 py-3 rounded-xl bg-pvchat-dark text-white hover:bg-pvchat-gray-dark transition-all"
              >
                Cancel
              </button>
              <button
                onClick={forceDelete}
                className="flex-1 admin-btn-danger py-3"
              >
                Delete App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;