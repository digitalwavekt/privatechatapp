import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await api.post('/admin/login', {
        email,
        password
      });

      const payload = data?.data || data || {};
      const token = payload.token || payload.accessToken;
      const adminUser = payload.user || payload.admin || null;

      if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
        toast.error('Admin access only');
        return;
      }

      if (!token) {
        toast.error('Token missing from server response');
        return;
      }

      setAuth(adminUser, token, payload.refreshToken || null);

      toast.success('Welcome Admin!');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('ADMIN LOGIN ERROR:', error.response?.data || error.message);

      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pvchat-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pvchat-blue rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">A</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Panel
          </h1>

          <p className="text-pvchat-gray">
            PVChat Administration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />

            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input pl-12"
              required
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input pl-12 pr-12"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-pvchat-gray"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-btn-primary w-full py-3"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;