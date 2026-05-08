import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';

import AdminLogin from './screens/AdminLogin';
import Dashboard from './screens/Dashboard';
import Users from './screens/Users';
import PendingApprovals from './screens/PendingApprovals';
import UserChats from './screens/UserChats';
import Activities from './screens/Activities';
import AdminLayout from './components/AdminLayout';

const PrivateRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token || user?.role !== 'admin') return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/" element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="pending" element={<PendingApprovals />} />
          <Route path="chats/:userId" element={<UserChats />} />
          <Route path="activities" element={<Activities />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;