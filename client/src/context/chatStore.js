import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeChat: null,
  messages: [],
  typingUsers: {},
  onlineUsers: new Set(),

  setConversations: (conversations) => set({ conversations }),

  setActiveChat: (chat) => set({ activeChat: chat, messages: [] }),

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  setMessages: (messages) => set({ messages }),

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map(msg =>
        msg._id === messageId ? { ...msg, status } : msg
      )
    }));
  },

  setTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping }
    }));
  },

  setOnlineStatus: (userId, isOnline) => {
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      if (isOnline) newSet.add(userId);
      else newSet.delete(userId);
      return { onlineUsers: newSet };
    });
  },

  updateLastMessage: (userId, message) => {
    set((state) => ({
      conversations: state.conversations.map(conv =>
        conv._id === userId ? { ...conv, lastMessage: message } : conv
      )
    }));
  }
}));