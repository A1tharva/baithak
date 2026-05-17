import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useMute } from "../context/MuteContext";
import { getUserConversations, getIncomingRequests, acceptFriendRequest, rejectFriendRequest, getFriendsList } from "../api";
import Avatar from "./Avatar";
import ConversationItem from "./ConversationItem";
import SearchModal from "./SearchModal";
import ProfileModal from "./ProfileModal";
import toast from "react-hot-toast";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const FriendSidebarItem = ({ friend, onStartChat, onRemove, onBlock, onViewProfile }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div
        onClick={onStartChat}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}
      >
        {friend.profilePic ? (
          <img
            src={friend.profilePic}
            alt={friend.username}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: '#4fd1c5', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#0d1117', fontWeight: 700,
            fontSize: '16px', flexShrink: 0,
          }}>
            {friend.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 500, fontSize: '14px', color: '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {friend.username}
          </div>
          <div style={{
            fontSize: '12px', color: '#666',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {friend.bio || 'Tap to chat'}
          </div>
        </div>
      </div>

      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
          style={{
            background: menuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: hovered || menuOpen ? '#e2e8f0' : 'transparent',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '50%',
            lineHeight: 1,
            transition: 'all 0.15s',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⋮
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '34px',
            background: '#1a1f2e',
            border: '1px solid #2d3748',
            borderRadius: '10px',
            padding: '6px',
            zIndex: 9999,
            minWidth: '170px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {[
              { icon: '👤', label: 'View Profile', action: onViewProfile, color: '#e2e8f0' },
              { icon: '💬', label: 'Send Message', action: onStartChat, color: '#e2e8f0' },
              null,
              { icon: '🗑️', label: 'Remove Friend', action: onRemove, color: '#ff9f43' },
              { icon: '🚫', label: 'Block User', action: onBlock, color: '#ff6b6b' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} style={{ height: '1px', background: '#2d3748', margin: '4px 0' }} />
              ) : (
                <div
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); item.action(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    color: item.color,
                    fontSize: '13px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatSidebarItem = ({ chat, otherUser, lastMsg, isSelected, onOpen, onRemove, onBlock, onViewProfile, unread }) => {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { isMuted } = useMute();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
        position: 'relative',
        background: isSelected
          ? 'rgba(79,209,197,0.1)'
          : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.15s',
        marginBottom: '2px',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {otherUser?.profilePic ? (
          <img src={otherUser.profilePic} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: '#4fd1c5', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#0d1117', fontWeight: 700, fontSize: '16px',
          }}>
            {otherUser?.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div style={{
              fontWeight: unread > 0 ? 600 : 500,
              fontSize: '14px',
              color: unread > 0 ? '#e2f0ff' : '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}>
              {otherUser?.username || 'Unknown'}
            </div>
            {isMuted(chat._id) && (
              <span title="Notifications muted" style={{ fontSize: '12px', opacity: 0.6, flexShrink: 0 }}>
                🔇
              </span>
            )}
          </div>
          <div style={{
            fontSize: '12px',
            color: unread > 0 && !isMuted(chat._id) ? '#22d3ee' : '#475569',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: unread > 0 ? 500 : 400,
          }}>
            {lastMsg}
          </div>
        </div>

        {/* Unread badge & timestamp meta block */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end',
          gap: '4px',
          flexShrink: 0,
        }}>
          {/* Timestamp */}
          <span style={{ 
            fontSize: '11px', 
            color: unread > 0 && !isMuted(chat._id) ? '#22d3ee' : '#475569',
            whiteSpace: 'nowrap',
          }}>
            {formatTime(chat.updatedAt)}
          </span>

          {/* Unread badge */}
          {unread > 0 && (
            <span style={{
              background: isMuted(chat._id) ? '#334155' : '#22d3ee',
              color: isMuted(chat._id) ? '#94a3b8' : '#060d14',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>

      <div
        ref={menuRef}
        style={{ position: 'relative', flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(p => !p); }}
          style={{
            background: menuOpen ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none',
            color: hovered || menuOpen ? '#aaa' : 'transparent',
            cursor: 'pointer',
            width: '28px', height: '28px',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', transition: 'all 0.15s',
            pointerEvents: hovered || menuOpen ? 'auto' : 'none',
          }}
        >
          ⋮
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '32px',
            background: '#1a1f2e', border: '1px solid #2d3748',
            borderRadius: '10px', padding: '6px',
            zIndex: 9999, minWidth: '170px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {[
              { icon: '👤', label: 'View Profile', action: onViewProfile, color: '#e2e8f0' },
              { icon: '💬', label: 'Open Chat', action: onOpen, color: '#e2e8f0' },
              'divider',
              { icon: '🗑️', label: 'Remove Friend', action: onRemove, color: '#ff9f43' },
              { icon: '🚫', label: 'Block User', action: onBlock, color: '#ff6b6b' },
            ].map((item, i) =>
              item === 'divider' ? (
                <div key={i} style={{ height: '1px', background: '#2d3748', margin: '4px 0' }} />
              ) : (
                <div
                  key={i}
                  onClick={() => { setMenuOpen(false); item.action?.(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: '7px', cursor: 'pointer',
                    color: item.color, fontSize: '13px', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptySidebarState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '16px',
    textAlign: 'center',
  }}>
    {/* Icon */}
    <div style={{
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: '#083344',
      border: '1px solid #155e7a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
    }}>
      👥
    </div>

    {/* Text */}
    <div>
      <p style={{
        fontSize: '15px',
        fontWeight: 600,
        color: '#e2f0ff',
        margin: '0 0 6px',
      }}>
        No friends yet
      </p>
      <p style={{
        fontSize: '13px',
        color: '#475569',
        margin: 0,
        lineHeight: 1.5,
      }}>
        Search for people by username to send a friend request
      </p>
    </div>

    {/* Arrow pointing to search bar */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: '#22d3ee',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      <span>↑</span>
      <span>Use the search bar above</span>
    </div>
  </div>
);

const Sidebar = ({ activeConvId, onSelectConversation, conversations, setConversations }) => {
  const { user, logout, setUser } = useAuth();
  const { onlineUsers } = useSocket();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [friends, setFriends] = useState([]);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const handleRemoveFriend = async (friend) => {
    const confirmed = window.confirm(`Remove ${friend.username} from friends?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch(`/api/friends/unfriend/${friend._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to remove.');
        return;
      }
      setFriends(prev => prev.filter(f => f._id?.toString() !== friend._id?.toString()));
      setConversations(prev => prev.filter(c =>
        !c.members?.some(p => (p._id?.toString() || p?.toString()) === friend._id?.toString())
      ));
      
      const activeConv = conversations.find(c => c._id === activeConvId);
      const otherMemberInActive = activeConv?.members?.find(m => m._id !== user?._id);
      if (otherMemberInActive?._id?.toString() === friend._id?.toString()) {
        onSelectConversation(null);
      }

      if (socket) {
        socket.emit('friend_removed', { fromUserId: user._id, toUserId: friend._id });
      }
      toast.success(`${friend.username} removed from friends.`);
      fetchFriends();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };

  const handleBlockUser = async (friend) => {
    const confirmed = window.confirm(
      `Block ${friend.username}?\n\nThey won't be able to message, call, or video call you.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch(`/api/friends/block/${friend._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to block.');
        return;
      }
      setFriends(prev => prev.filter(f => f._id?.toString() !== friend._id?.toString()));
      setConversations(prev => prev.filter(c =>
        !c.members?.some(p => (p._id?.toString() || p?.toString()) === friend._id?.toString())
      ));

      const activeConv = conversations.find(c => c._id === activeConvId);
      const otherMemberInActive = activeConv?.members?.find(m => m._id !== user?._id);
      if (otherMemberInActive?._id?.toString() === friend._id?.toString()) {
        onSelectConversation(null);
      }

      // Update user context
      const updatedBlocked = [...(user.blockedUsers || []), friend._id];
      setUser({
        ...user,
        blockedUsers: updatedBlocked
      });

      if (socket) {
        socket.emit('user_blocked', { blockedBy: user._id, blockedUser: friend._id });
      }
      toast.success(`${friend.username} has been blocked.`);
      fetchFriends();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };

  const fetchRequests = async () => {
    if (!user?._id) return;
    try {
      const { data } = await getIncomingRequests();
      setIncomingRequests(data);
    } catch {}
  };

  const fetchFriends = async () => {
    if (!user?._id) return;
    try {
      const { data } = await getFriendsList();
      console.log('FETCHED FRIENDS:', data);
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user?._id) return;

    const token = localStorage.getItem("baithak_token");
    fetch('/api/friends/repair-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      console.log('REPAIR RESULT:', data);
      if (data.yourFriends) setFriends(data.yourFriends);
    }).catch(err => console.error('Repair error:', err));

    fetchRequests();
    fetchFriends();
    if (socket) {
      socket.on('friend_request_received', fetchRequests);
      socket.on('friend_added', fetchFriends);
      socket.on('friend_request_accepted', fetchFriends);

      const onFriendRemoved = ({ fromUserId, toUserId, removedBy }) => {
        const targetFriendId = removedBy || (user?._id?.toString() === fromUserId?.toString() ? toUserId : fromUserId);
        if (!targetFriendId) return;

        setFriends(prev => prev.filter(f => f._id?.toString() !== targetFriendId.toString()));
        setConversations(prev => prev.filter(c =>
          !c.members?.some(p => (p._id?.toString() || p?.toString()) === targetFriendId.toString())
        ));
        
        const activeConv = conversations.find(c => c._id === activeConvId);
        const otherMemberInActive = activeConv?.members?.find(m => m._id !== user?._id);
        if (otherMemberInActive?._id?.toString() === targetFriendId.toString()) {
          onSelectConversation(null);
        }
        
        fetchFriends();
      };

      const onUserBlocked = ({ blockedBy, blockedUser }) => {
        const otherUserId = user?._id?.toString() === blockedBy?.toString() ? blockedUser : blockedBy;
        if (!otherUserId) return;

        setFriends(prev => prev.filter(f => f._id?.toString() !== otherUserId.toString()));
        setConversations(prev => prev.filter(c =>
          !c.members?.some(p => (p._id?.toString() || p?.toString()) === otherUserId.toString())
        ));

        const activeConv = conversations.find(c => c._id === activeConvId);
        const otherMemberInActive = activeConv?.members?.find(m => m._id !== user?._id);
        if (otherMemberInActive?._id?.toString() === otherUserId.toString()) {
          onSelectConversation(null);
        }

        if (user?._id?.toString() === blockedUser?.toString()) {
          toast.error('You have been blocked by a user.');
        }
        
        fetchFriends();
      };

      socket.on('friend_removed', onFriendRemoved);
      socket.on('friend:removed', onFriendRemoved);
      socket.on('user_blocked', onUserBlocked);

      return () => {
        socket.off('friend_request_received', fetchRequests);
        socket.off('friend_added', fetchFriends);
        socket.off('friend_request_accepted', fetchFriends);
        socket.off('friend_removed', onFriendRemoved);
        socket.off('friend:removed', onFriendRemoved);
        socket.off('user_blocked', onUserBlocked);
      };
    }
  }, [user?._id, socket, conversations, activeConvId]);

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await acceptFriendRequest(requestId);
      console.log('ACCEPT RESPONSE:', res.data);
      setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Friend added!');
      fetchFriends();
    } catch (err) {
      console.error('ACCEPT ERROR:', err);
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const fetchConversations = async () => {
    if (!user?._id) return;
    try {
      const { data } = await getUserConversations(user._id);
      setConversations(data);
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchFriends()]);
      setLoading(false);
    };
    init();
  }, [user]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") setShowSearch(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleSelectNewConversation = (conv) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === conv._id);
      if (exists) return prev;
      return [conv, ...prev];
    });
    onSelectConversation(conv);
  };

  const startChatWith = async (friend) => {
    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: friend._id }),
      });
      const chat = await res.json();
      if (!res.ok) {
        toast.error(chat.message || 'Cannot start chat.');
        return;
      }
      
      setConversations(prev => {
        if (!prev.find(c => c._id === chat._id)) {
          return [chat, ...prev];
        }
        return prev;
      });
      onSelectConversation(chat);
    } catch (err) {
      console.error('START CHAT ERROR:', err);
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const friendsWithConversations = new Set(
    conversations.map(conv => {
      const other = conv.members?.find(
        p => p._id?.toString() !== user?._id?.toString()
      );
      return other?._id?.toString();
    }).filter(Boolean)
  );

  const friendsWithoutConversations = friends.filter(
    f => !friendsWithConversations.has(f._id?.toString())
  );

  const sortedConversations = [...conversations].sort((a, b) => {
    const unreadA = a.unreadCount || 0;
    const unreadB = b.unreadCount || 0;
    
    // Unread first
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadB > 0 && unreadA === 0) return 1;
    
    // Then by latest message time
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  console.log('SIDEBAR RENDERING - friends:', friends, 'length:', friends?.length);

  return (
    <>
      <aside className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between h-[56px] px-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Bai<span className="text-[var(--accent)]">thak</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div 
              style={{ position: 'relative', cursor: 'pointer' }} 
              onClick={() => setShowRequestsPanel(!showRequestsPanel)}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-lg"
              title="Friend Requests"
            >
              🔔
              {incomingRequests.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#ff6b6b', color: '#fff',
                  borderRadius: '50%', width: '16px', height: '16px',
                  fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700,
                }}>
                  {incomingRequests.length}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowSearch(true)}
              className="w-8 h-8 rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Add Friends (Ctrl+K)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-3 border-b border-[var(--border)]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              readOnly
              onClick={() => setShowSearch(true)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-full)] py-[9px] pl-9 pr-4 text-[var(--text-secondary)] text-[16px] placeholder:text-[var(--text-faint)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
            />
          </div>
        </div>

        {/* Conversations and Friends list */}
        <div className="flex-1 overflow-y-auto space-y-0.5 px-1.5 pb-2">
          {loading && <SidebarSkeleton />}

          {!loading && friends.length === 0 && conversations.length === 0 && (
            <EmptySidebarState />
          )}

          {/* Section 1: Active chats */}
          {!loading && sortedConversations.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: '#888', padding: '8px 12px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Recent Chats</p>
              {sortedConversations.map((conv) => {
                const otherParticipant = conv.members?.find(
                  (m) => m._id?.toString() !== user?._id?.toString()
                );
                const lastMsg = conv.lastMessage?.text || conv.lastMessage?.fileName || 'Start chatting!';
                return (
                  <ChatSidebarItem
                    key={conv._id}
                    chat={conv}
                    otherUser={otherParticipant}
                    lastMsg={lastMsg}
                    isSelected={conv._id === activeConvId}
                    onOpen={() => onSelectConversation(conv)}
                    onRemove={() => handleRemoveFriend(otherParticipant)}
                    onBlock={() => handleBlockUser(otherParticipant)}
                    onViewProfile={() => navigate(`/profile/${otherParticipant?._id}`)}
                    unread={conv.unreadCount || 0}
                  />
                );
              })}
            </div>
          )}

          {/* Section 2: Friends */}
          {friendsWithoutConversations && friendsWithoutConversations.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{
                fontSize: '11px', color: '#666',
                padding: '0 16px 6px', letterSpacing: '0.08em',
                textTransform: 'uppercase', margin: 0,
              }}>
                Friends
              </p>
              {friendsWithoutConversations.map(friend => (
                <FriendSidebarItem
                  key={friend._id}
                  friend={friend}
                  onStartChat={() => startChatWith(friend)}
                  onRemove={() => handleRemoveFriend(friend)}
                  onBlock={() => handleBlockUser(friend)}
                  onViewProfile={() => navigate(`/profile/${friend._id}`)}
                />
              ))}
            </div>
          )}

          {!loading && conversations.length === 0 && friendsWithoutConversations.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: '13px', padding: '2rem 1rem' }}>
              No friends yet. Search for users to add them.
            </div>
          )}
        </div>

        {/* Bottom profile bar */}
        <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-secondary)]">
          <div 
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] transition-colors group cursor-pointer"
          >
            <div className="relative">
              <Avatar username={user?.username} profilePic={user?.profilePic} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--online)] block border-2 border-[var(--bg-secondary)]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)] text-sm truncate">{user?.username}</p>
              <p className="text-[11px] text-[var(--accent)]">Online</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
        />
      )}

      {showRequestsPanel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4" onClick={() => setShowRequestsPanel(false)}>
          <div className="glass rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--border)] font-bold">
              Friend Requests
            </div>
            <div className="max-h-80 overflow-y-auto">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No pending requests</div>
              ) : (
                incomingRequests.map(req => (
                  <div key={req._id} className="flex items-center gap-3 p-4 border-b border-[var(--border)] last:border-0">
                    <Avatar username={req.sender.username} profilePic={req.sender.profilePic} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">{req.sender.username}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{req.sender.bio || 'Wants to connect'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAcceptRequest(req._id)} className="bg-[var(--accent)] text-[var(--bg-primary)] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[var(--accent-dim)]">Accept</button>
                      <button onClick={() => handleRejectRequest(req._id)} className="bg-transparent border border-[var(--border)] text-[var(--text-muted)] px-3 py-1.5 rounded-lg text-xs font-bold hover:text-red-400">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border)] text-center">
              <button onClick={() => setShowRequestsPanel(false)} className="text-xs text-[var(--text-muted)] hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <ProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          currentUser={user}
          onUpdate={handleUpdateUser}
        />
      )}
    </>
  );
};

const FriendMenuItem = ({ onClick, children, danger }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      width: '100%',
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: '13px',
      color: danger ? '#ff5555' : 'var(--text-primary)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderRadius: '4px',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
);

const FriendItem = ({ friend, isOnline, onStartChat, onRemove, onBlock, navigate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      onClick={() => onStartChat(friend)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        const btn = e.currentTarget.querySelector('.friend-menu-btn');
        if (btn) btn.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        const btn = e.currentTarget.querySelector('.friend-menu-btn');
        if (btn) btn.style.opacity = '0';
      }}
    >
      <div className="relative">
        <Avatar username={friend.username} profilePic={friend.profilePic} size="md" />
        <div className="absolute -bottom-0.5 -right-0.5">
          <span
            className={`w-3 h-3 rounded-full block border-2 border-[var(--bg-secondary)] ${
              isOnline ? 'bg-[var(--online)]' : 'bg-slate-500'
            }`}
          />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>
          {friend.username}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {friend.bio || 'Start chatting'}
        </div>
      </div>

      {/* Three dot button */}
      <button
        className="friend-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-faint)',
          cursor: 'pointer',
          padding: '4px',
          opacity: showMenu ? '1' : '0',
          transition: 'opacity 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>⋮</span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '40px',
            right: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            padding: '4px',
            minWidth: '130px',
          }}
        >
          <FriendMenuItem onClick={() => navigate(`/profile/${friend._id}`)}>
            👤 Profile
          </FriendMenuItem>
          <FriendMenuItem onClick={() => onRemove(friend)} danger>
            🗑️ Unfriend
          </FriendMenuItem>
          <FriendMenuItem onClick={() => onBlock(friend)} danger>
            🚫 Block
          </FriendMenuItem>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
