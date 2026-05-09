import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserPlus, FaBan, FaUserCheck, FaPhone, FaComment } from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data } = await api.get('/users/contacts');

      const contactsData = Array.isArray(data)
        ? data
        : Array.isArray(data?.contacts)
          ? data.contacts
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setContacts(contactsData);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const { data } = await api.get(`/users/search/${searchQuery}`);
      setSearchResult(data);
    } catch (error) {
      toast.error('User not found or not approved');
      setSearchResult(null);
    }
  };

  const addContact = async (userId) => {
    try {
      await api.post('/users/contacts', { userId });
      toast.success('Contact added!');
      loadContacts();
      setSearchResult(null);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const blockUser = async (userId) => {
    try {
      await api.post(`/users/block/${userId}`);
      toast.success('User blocked');
      loadContacts();
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const startChat = (userId) => {
    window.location.href = `/?user=${userId}`;
  };

  const startCall = (type, userId) => {
    window.location.href = `/call/new?type=${type}&user=${userId}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-white">Contacts</h2>
      </div>

      {/* Search */}
      <div className="p-4 bg-pvchat-dark border-b border-pvchat-gray-dark/30">
        <form onSubmit={searchUser} className="flex gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          <button type="submit" className="btn-primary px-6">
            Search
          </button>
        </form>

        {/* Search Result */}
        {searchResult && (
          <div className="mt-4 card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {searchResult.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">{searchResult.name}</h4>
                <p className="text-xs text-pvchat-gray">{searchResult.phone}</p>
              </div>
            </div>
            <button
              onClick={() => addContact(searchResult._id)}
              className="p-2 bg-pvchat-blue rounded-lg text-white hover:bg-pvchat-blue-dark transition-all"
            >
              <FaUserPlus />
            </button>
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaUserPlus className="text-4xl text-pvchat-gray mx-auto mb-4" />
              <p className="text-pvchat-gray">No contacts yet</p>
              <p className="text-sm text-pvchat-gray-dark mt-2">
                Search by phone number to add contacts
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className="card p-4 flex items-center justify-between hover:bg-pvchat-card/80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {contact.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    {contact.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-pvchat-card" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{contact.name}</h4>
                    <p className="text-xs text-pvchat-gray">{contact.phone}</p>
                    <p className="text-xs text-pvchat-gray-dark">
                      {contact.isOnline ? 'Online' : `Last seen ${new Date(contact.lastSeen).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startCall('audio', contact._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-success transition-all"
                    title="Audio Call"
                  >
                    <FaPhone />
                  </button>
                  <button
                    onClick={() => startCall('video', contact._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                    title="Video Call"
                  >
                    <FaPhone className="rotate-90" />
                  </button>
                  <button
                    onClick={() => startChat(contact._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                    title="Message"
                  >
                    <FaComment />
                  </button>
                  <button
                    onClick={() => blockUser(contact._id)}
                    className="p-2 text-pvchat-gray hover:text-pvchat-danger transition-all"
                    title="Block"
                  >
                    <FaBan />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;