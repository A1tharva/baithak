import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MuteContext = createContext();

export const MuteProvider = ({ children }) => {
  const [mutedChats, setMutedChats] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Load muted chats on mount
  useEffect(() => {
    const fetchMuted = async () => {
      try {
        const token = localStorage.getItem('baithak_token');
        if (!token) return;
        const res = await fetch('/api/users/muted', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const ids = data.map(m => m.conversationId);
        setMutedChats(new Set(ids));
      } catch (err) {
        console.error('Failed to load muted chats:', err);
      }
    };
    fetchMuted();
  }, []);

  const isMuted = useCallback((conversationId) => {
    return mutedChats.has(conversationId?.toString());
  }, [mutedChats]);

  const muteChat = useCallback(async (conversationId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('baithak_token');
      await fetch(`/api/users/mute/${conversationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMutedChats(prev => new Set([...prev, conversationId.toString()]));
    } catch (err) {
      console.error('Mute failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unmuteChat = useCallback(async (conversationId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('baithak_token');
      await fetch(`/api/users/unmute/${conversationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMutedChats(prev => {
        const next = new Set(prev);
        next.delete(conversationId.toString());
        return next;
      });
    } catch (err) {
      console.error('Unmute failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleMute = useCallback(async (conversationId) => {
    if (isMuted(conversationId)) {
      await unmuteChat(conversationId);
    } else {
      await muteChat(conversationId);
    }
  }, [isMuted, muteChat, unmuteChat]);

  return (
    <MuteContext.Provider value={{ 
      isMuted, muteChat, unmuteChat, 
      toggleMute, mutedChats, loading 
    }}>
      {children}
    </MuteContext.Provider>
  );
};

export const useMute = () => useContext(MuteContext);
