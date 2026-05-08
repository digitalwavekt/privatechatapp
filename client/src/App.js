import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';
import { useSocket } from './hooks/useSocket';

import Login from './screens/Login';
import Register from './screens/Register';
import Chat from './screens/Chat';
import Calls from './screens/Calls';
import Groups from './screens/Groups';
import Contacts from './screens/Contacts';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import CallScreen from './screens/CallScreen';
import Layout from './components/Layout';
import PendingApproval from './screens/PendingApproval';

const PrivateRoute = ({ children }) => {
  const { user, token } = useAuthStore();

  if (!token) return <Navigate to="/login" />;
  if (user?.status === 'pending') return <PendingApproval />;
  if (user?.status === 'blocked') return <Navigate to="/login" />;

  return children;
};

function App() {
  const { token } = useAuthStore();
  useSocket(token);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Chat />} />
          <Route path="calls" element={<Calls />} />
          <Route path="groups" element={<Groups />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/call/:callId" element={
          <PrivateRoute>
            <CallScreen />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;