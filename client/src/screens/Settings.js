import React, { useState } from 'react';
import { FaBell, FaMoon, FaShieldAlt, FaTrash, FaChevronRight } from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';
import toast from 'react-hot-toast';

const Settings = () => {
  const { logout } = useAuthStore();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    darkMode: true,
    readReceipts: true,
    typingIndicators: true
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key} ${settings[key] ? 'disabled' : 'enabled'}`);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      indexedDB.deleteDatabase('pvchat-db');
      logout();
      window.location.href = '/login';
    }
  };

  const settingItems = [
    { key: 'notifications', label: 'Notifications', icon: FaBell, description: 'Receive push notifications' },
    { key: 'soundEnabled', label: 'Sound', icon: FaBell, description: 'Play sounds for messages' },
    { key: 'darkMode', label: 'Dark Mode', icon: FaMoon, description: 'Use dark theme' },
    { key: 'readReceipts', label: 'Read Receipts', icon: FaShieldAlt, description: 'Show when messages are read' },
    { key: 'typingIndicators', label: 'Typing Indicators', icon: FaShieldAlt, description: 'Show when someone is typing' }
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

        {/* General Settings */}
        <div className="card mb-6">
          <div className="p-4 border-b border-pvchat-gray-dark/30">
            <h3 className="text-lg font-semibold text-white">General</h3>
          </div>
          <div className="divide-y divide-pvchat-gray-dark/30">
            {settingItems.map((item) => (
              <div key={item.key} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pvchat-dark flex items-center justify-center">
                    <item.icon className="text-pvchat-blue" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{item.label}</h4>
                    <p className="text-xs text-pvchat-gray">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(item.key)}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings[item.key] ? 'bg-pvchat-blue' : 'bg-pvchat-gray-dark'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                    settings[item.key] ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="card mb-6">
          <div className="p-4 border-b border-pvchat-gray-dark/30">
            <h3 className="text-lg font-semibold text-white">Privacy & Security</h3>
          </div>
          <div className="divide-y divide-pvchat-gray-dark/30">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-pvchat-dark/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pvchat-dark flex items-center justify-center">
                  <FaShieldAlt className="text-pvchat-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">Privacy Policy</h4>
                  <p className="text-xs text-pvchat-gray">Read our privacy policy</p>
                </div>
              </div>
              <FaChevronRight className="text-pvchat-gray" />
            </div>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-pvchat-dark/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pvchat-dark flex items-center justify-center">
                  <FaShieldAlt className="text-pvchat-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">Terms of Service</h4>
                  <p className="text-xs text-pvchat-gray">Read our terms</p>
                </div>
              </div>
              <FaChevronRight className="text-pvchat-gray" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-pvchat-danger/30">
          <div className="p-4 border-b border-pvchat-gray-dark/30">
            <h3 className="text-lg font-semibold text-pvchat-danger">Danger Zone</h3>
          </div>
          <div className="p-4">
            <button
              onClick={clearAllData}
              className="w-full py-3 rounded-xl bg-pvchat-danger/10 text-pvchat-danger hover:bg-pvchat-danger/20 transition-all flex items-center justify-center gap-2"
            >
              <FaTrash />
              Clear All Data & Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;