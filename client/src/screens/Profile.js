import React, { useState, useEffect } from 'react';
import { FaCamera, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: formData.name
      });
      updateUser({ name: data.name });
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image should be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await api.put('/users/profile', { avatar: data.url });
      updateUser({ avatar: data.url });
      toast.success('Avatar updated!');
    } catch (error) {
      toast.error('Failed to update avatar');
    }
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>

        <div className="card p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-pvchat-blue flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-pvchat-blue rounded-full flex items-center justify-center cursor-pointer hover:bg-pvchat-blue-dark transition-all">
                <FaCamera className="text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <h3 className="text-xl font-semibold text-white mt-4">{user.name}</h3>
            <p className="text-pvchat-gray">{user.email}</p>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-pvchat-gray mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              ) : (
                <p className="text-white">{user.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-pvchat-gray mb-1">Email</label>
              <p className="text-white">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm text-pvchat-gray mb-1">Phone</label>
              <p className="text-white">{user.phone}</p>
            </div>

            <div>
              <label className="block text-sm text-pvchat-gray mb-1">Status</label>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                user.status === 'approved' 
                  ? 'bg-green-500/20 text-green-400' 
                  : user.status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
              </span>
            </div>

            <div>
              <label className="block text-sm text-pvchat-gray mb-1">Role</label>
              <p className="text-white capitalize">{user.role}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl bg-pvchat-dark text-white hover:bg-pvchat-gray-dark transition-all flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <FaSave />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 rounded-xl bg-pvchat-blue text-white hover:bg-pvchat-blue-dark transition-all flex items-center justify-center gap-2"
              >
                <FaEdit />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;