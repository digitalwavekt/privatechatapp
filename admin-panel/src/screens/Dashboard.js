import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserClock, FaUserCheck, FaUserSlash, FaComments, FaChartLine } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

const normalizeArray = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeObject = (data, key, fallback = {}) => {
  if (data && typeof data === 'object' && !Array.isArray(data?.[key]) && data?.[key] && typeof data[key] === 'object') return data[key];
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return fallback;
};

const safeDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalMessages: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadStats();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/dashboard');
      const payload = data?.data || data || {};
      const incomingStats = normalizeObject(payload, 'stats', {});

      setStats({
        totalUsers: Number(incomingStats.totalUsers || incomingStats.users || 0),
        pendingUsers: Number(incomingStats.pendingUsers || incomingStats.pending || 0),
        activeUsers: Number(incomingStats.activeUsers || incomingStats.active || 0),
        blockedUsers: Number(incomingStats.blockedUsers || incomingStats.blocked || 0),
        totalMessages: Number(incomingStats.totalMessages || incomingStats.messages || 0)
      });

      setRecentUsers(normalizeArray(payload, 'recentUsers'));
    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load dashboard');
      setRecentUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      const payload = data?.data || data || {};
      const dailyStats = normalizeArray(payload, 'dailyStats');
      const statusStats = normalizeArray(payload, 'userStats');

      setChartData(dailyStats.map((s, index) => ({
        date: s?._id || s?.date || `Day ${index + 1}`,
        messages: Number(s?.count || s?.messages || 0)
      })));

      setUserStats(statusStats.map((s) => ({
        name: s?._id || s?.status || 'unknown',
        value: Number(s?.count || s?.value || 0)
      })));
    } catch (error) {
      console.error('Stats error:', error);
      setChartData([]);
      setUserStats([]);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: FaUsers, color: 'text-pvchat-blue', bg: 'bg-pvchat-blue/10' },
    { label: 'Pending Approval', value: stats.pendingUsers, icon: FaUserClock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Active Now', value: stats.activeUsers, icon: FaUserCheck, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Blocked', value: stats.blockedUsers, icon: FaUserSlash, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Total Messages', value: stats.totalMessages, icon: FaComments, color: 'text-purple-400', bg: 'bg-purple-400/10' }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#9ca3af'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-12 h-12 border-4 border-pvchat-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2 text-pvchat-gray">
          <FaChartLine />
          <span className="text-sm">Real-time Overview</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="admin-card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`text-xl ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-pvchat-gray">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-white mb-4">Message Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={normalizeArray(chartData)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card">
          <h3 className="text-lg font-semibold text-white mb-4">User Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={normalizeArray(userStats)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {normalizeArray(userStats).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {normalizeArray(userStats).map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-pvchat-gray capitalize">{entry?.name || 'unknown'}: {entry?.value || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Users</h3>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {normalizeArray(recentUsers).map((user, index) => (
                <tr key={user?._id || user?.id || index}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pvchat-blue flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{(user?.name || user?.email || 'U')?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm text-white">{user?.name || 'Unknown User'}</span>
                    </div>
                  </td>
                  <td>{user?.email || '-'}</td>
                  <td>{user?.phone || '-'}</td>
                  <td><span className={`status-${user?.status || 'unknown'}`}>{user?.status || 'unknown'}</span></td>
                  <td>{safeDate(user?.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
