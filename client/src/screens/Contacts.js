import React, { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaUserPlus, FaBan, FaPhone, FaComment, FaVideo } from 'react-icons/fa';
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

const normalizeObject = (data, key) => {
  if (!data) return null;
  if (data?.[key] && typeof data[key] === 'object') return data[key];
  if (data?.user && typeof data.user === 'object') return data.user;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  if (typeof data === 'object' && !Array.isArray(data)) return data;
  return null;
};

const getId = (item) => item?._id || item?.id || item?.userId || item?.user?._id || item?.user?.id;
const getName = (item) => item?.name || item?.fullName || item?.user?.name || item?.email || 'Unknown User';
const getPhone = (item) => item?.phone || item?.mobile || item?.user?.phone || '';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeContacts = useMemo(() => normalizeArray(contacts), [contacts]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users/contacts');
      setContacts(normalizeArray(data, 'contacts'));
    } catch (error) {
      console.error('Load contacts error:', error);
      toast.error(error.response?.data?.message || 'Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    try {
      const { data } = await api.get(`/users/search/${encodeURIComponent(query)}`);
      const user = normalizeObject(data, 'user');
      setSearchResult(user);
      if (!user) toast.error('User not found or not approved');
    } catch (error) {
      console.error('Search user error:', error);
      toast.error(error.response?.data?.message || 'User not found or not approved');
      setSearchResult(null);
    }
  };

  const addContact = async (userId) => {
    if (!userId) {
      toast.error('Invalid user');
      return;
    }

    try {
      await api.post('/users/contacts', { userId });
      toast.success('Contact added!');
      await loadContacts();
      setSearchResult(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Add contact error:', error);
      toast.error(error.response?.data?.message || 'Failed to add contact');
    }
  };

  const blockUser = async (userId) => {
    if (!userId) return;

    try {
      await api.post(`/users/block/${userId}`);
      toast.success('User blocked');
      await loadContacts();
    } catch (error) {
      console.error('Block user error:', error);
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  const startChat = (userId) => {
    if (!userId) return;
    window.location.href = `/?user=${userId}`;
  };

  const startCall = (type, userId) => {
    if (!userId) return;
    window.location.href = `/call/new?type=${type}&user=${userId}`;
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    try {
      return `Last seen ${new Date(lastSeen).toLocaleDateString()}`;
    } catch {
      return 'Offline';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 bg-pvchat-dark border-b border-pvchat-gray-dark/30 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-white">Contacts</h2>
      </div>

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

        {searchResult && (
          <div className="mt-4 card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-white">
                  {getName(searchResult)?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{getName(searchResult)}</h4>
                <p className="text-xs text-pvchat-gray truncate">{getPhone(searchResult)}</p>
              </div>
            </div>
            <button
              onClick={() => addContact(getId(searchResult))}
              className="p-2 bg-pvchat-blue rounded-lg text-white hover:bg-pvchat-blue-dark transition-all"
              title="Add contact"
            >
              <FaUserPlus />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-pvchat-blue border-t-transparent rounded-full" />
          </div>
        ) : safeContacts.length === 0 ? (
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
            {safeContacts.map((contact, index) => {
              const contactId = getId(contact) || index;
              const name = getName(contact);
              const phone = getPhone(contact);

              return (
                <div
                  key={contactId}
                  className="card p-4 flex items-center justify-between hover:bg-pvchat-card/80 transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-pvchat-blue flex items-center justify-center overflow-hidden">
                        {contact?.avatar ? (
                          <img src={contact.avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      {contact?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-pvchat-card" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{name}</h4>
                      <p className="text-xs text-pvchat-gray truncate">{phone}</p>
                      <p className="text-xs text-pvchat-gray-dark truncate">
                        {contact?.isOnline ? 'Online' : formatLastSeen(contact?.lastSeen)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startCall('audio', getId(contact))}
                      className="p-2 text-pvchat-gray hover:text-pvchat-success transition-all"
                      title="Audio Call"
                    >
                      <FaPhone />
                    </button>
                    <button
                      onClick={() => startCall('video', getId(contact))}
                      className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                      title="Video Call"
                    >
                      <FaVideo />
                    </button>
                    <button
                      onClick={() => startChat(getId(contact))}
                      className="p-2 text-pvchat-gray hover:text-pvchat-blue transition-all"
                      title="Message"
                    >
                      <FaComment />
                    </button>
                    <button
                      onClick={() => blockUser(getId(contact))}
                      className="p-2 text-pvchat-gray hover:text-pvchat-danger transition-all"
                      title="Block"
                    >
                      <FaBan />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;
