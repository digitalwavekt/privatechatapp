import React from 'react';
import { FaClock, FaSignOutAlt } from 'react-icons/fa';
import { useAuthStore } from '../context/authStore';

const PendingApproval = () => {
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-pvchat-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-yellow-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
          <FaClock className="text-4xl text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Pending Approval</h1>
        <p className="text-pvchat-gray mb-2">
          Your account is currently under review by the admin.
        </p>
        <p className="text-pvchat-gray mb-8">
          You will be notified once your account is approved. Please wait patiently.
        </p>
        <button
          onClick={logout}
          className="btn-danger flex items-center justify-center gap-2 mx-auto"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;