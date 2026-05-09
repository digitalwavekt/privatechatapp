import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt, FaUsers, FaUserClock,
  FaHistory, FaSignOutAlt, FaShieldAlt
} from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';
import toast from 'react-hot-toast';

const AdminLayout = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: FaTachometerAlt, label: 'Dashboard' },
    { path: '/users', icon: FaUsers, label: 'All Users' },
    { path: '/pending', icon: FaUserClock, label: 'Pending' },
    { path: '/activities', icon: FaHistory, label: 'Activities' },
  ];

  return (
    <div className="min-h-screen bg-pvchat-black flex">
      {/* Sidebar */}
      <div className="w-64 bg-pvchat-dark border-r border-pvchat-gray-dark/30 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-pvchat-gray-dark/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pvchat-blue rounded-lg flex items-center justify-center">
              <FaShieldAlt className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">PVChat</h1>
              <p className="text-xs text-pvchat-gray">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${isActive
                  ? 'bg-pvchat-blue/10 text-pvchat-blue'
                  : 'text-pvchat-gray hover:text-white hover:bg-pvchat-card'
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-pvchat-gray-dark/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-pvchat-blue flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {(user?.name || user?.email || 'A')?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name || user?.email || 'Admin'}</p>
              <p className="text-xs text-pvchat-gray">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-pvchat-danger hover:bg-pvchat-danger/10 transition-all text-sm"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;