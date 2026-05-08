import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FaComments, FaPhone, FaUsers, FaAddressBook,
  FaUser, FaCog, FaSignOutAlt, FaSearch
} from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';
import { useChatStore } from '../context/chatStore';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Layout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    try {
      // Search by phone number
      const { data } = await api.get(`/users/search/${searchQuery}`);
      // Navigate to chat with this user
      navigate(`/?user=${data._id}`);
      setShowSearch(false);
      setSearchQuery('');
    } catch (error) {
      toast.error('User not found');
    }
  };

  const navItems = [
    { path: '/', icon: FaComments, label: 'Chats' },
    { path: '/calls', icon: FaPhone, label: 'Calls' },
    { path: '/groups', icon: FaUsers, label: 'Groups' },
    { path: '/contacts', icon: FaAddressBook, label: 'Contacts' },
  ];

  return (
    <div className="h-screen bg-pvchat-black flex">
      {/* Sidebar */}
      <div className="w-20 bg-pvchat-dark border-r border-pvchat-gray-dark/30 flex flex-col items-center py-6">
        {/* Logo */}
        <div className="w-12 h-12 bg-pvchat-blue rounded-xl flex items-center justify-center mb-8">
          <span className="text-xl font-bold text-white">PV</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="text-xl" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="nav-item"
          >
            <FaSearch className="text-xl" />
          </button>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FaUser className="text-xl" />
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FaCog className="text-xl" />
          </NavLink>
          <button onClick={handleLogout} className="nav-item text-pvchat-danger hover:text-red-400">
            <FaSignOutAlt className="text-xl" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-white">
            PVChat
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pvchat-blue flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-pvchat-gray">{user?.name}</span>
          </div>
        </header>

        {/* Search Overlay */}
        {showSearch && (
          <div className="absolute top-16 left-20 right-0 bg-pvchat-card border-b border-pvchat-gray-dark/30 p-4 z-50">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary px-6">
                Search
              </button>
            </form>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;