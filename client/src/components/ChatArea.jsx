import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useMute } from "../context/MuteContext";
import { getMessages, sendMessage as sendMessageAPI } from "../api";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import Avatar from "./Avatar";
import OnlineIndicator from "./OnlineIndicator";
import FilePreview from "./FilePreview";
import { useWebRTC } from "../context/WebRTCContext";
import { Video, Phone, MoreVertical, X, Reply as ReplyIcon } from "lucide-react";
import { uploadFile, getMessageType, isImageFile } from "../services/uploadService";
import ForwardModal from "./ForwardModal";
import toast from 'react-hot-toast';
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import MessageSkeleton from "./skeletons/MessageSkeleton";

const formatLastSeen = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Paperclip SVG
const PaperclipIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ChatMenuItem = ({ icon, label, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 12px',
      borderRadius: '7px',
      cursor: 'pointer',
      color: color || '#e2e8f0',
      fontSize: '13px',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ fontSize: '15px' }}>{icon}</span>
    <span>{label}</span>
  </div>
);

const showToast = (message) => {
  const toastEl = document.createElement('div');
  toastEl.textContent = message;
  toastEl.style.cssText = `
    position: fixed; bottom: 80px; left: 50%;
    transform: translateX(-50%);
    background: #0d1825; border: 1px solid #0e2a3d;
    color: #e2f0ff; padding: 10px 20px;
    border-radius: 20px; font-size: 13px;
    z-index: 9999; white-space: nowrap;
    animation: fadeInUp 0.2s ease;
  `;
  document.body.appendChild(toastEl);
  setTimeout(() => toastEl.remove(), 2500);
};

const ChatArea = ({ conversation, onNewMessage, onBack }) => {
  const { user, setUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { isMuted, toggleMute, loading: muteLoading } = useMute();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const close = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [headerMenuOpen]);

  const handleRemoveFriend = async (friend) => {
    const targetFriend = friend || otherMember;
    console.log('handleRemoveFriend triggered with:', { friend, otherMember, targetFriend });
    if (!targetFriend || !targetFriend._id) {
      console.error('No target friend ID found to remove', { friend, otherMember });
      toast.error('Cannot remove friend: details are still loading.');
      return;
    }

    const confirmed = window.confirm(`Remove ${targetFriend.username || 'this user'} from friends?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/friends/unfriend/${targetFriend._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to remove.');
        return;
      }
      if (socket) {
        socket.emit('friend_removed', { fromUserId: user._id, toUserId: targetFriend._id });
      }
      toast.success(`${targetFriend.username || 'User'} removed from friends.`);
      if (onBack) onBack();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };

  const handleBlockUser = async (friend) => {
    const targetFriend = friend || otherMember;
    console.log('handleBlockUser triggered with:', { friend, otherMember, targetFriend });
    if (!targetFriend || !targetFriend._id) {
      console.error('No target friend ID found to block', { friend, otherMember });
      toast.error('Cannot block user: details are still loading.');
      return;
    }

    const confirmed = window.confirm(
      `Block ${targetFriend.username || 'this user'}?\n\nThey won't be able to message, call, or video call you.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/friends/block/${targetFriend._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to block.');
        return;
      }

      // Update user context
      const updatedBlocked = [...(user.blockedUsers || []), targetFriend._id];
      setUser({
        ...user,
        blockedUsers: updatedBlocked
      });

      if (socket) {
        socket.emit('user_blocked', { blockedBy: user._id, blockedUser: targetFriend._id });
      }
      toast.success(`${targetFriend.username || 'User'} has been blocked.`);
      if (onBack) onBack();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // File upload state
  const [pendingFile, setPendingFile] = useState(null);   // File object waiting to send
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Reply and Forward state
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);

  const { isListening, transcript, error, language, setLanguage, startListening, stopListening } = useSpeechRecognition();

  const { startCall } = useWebRTC();

  const otherMember = conversation?.members?.find((m) => m._id !== user?._id);
  const isOtherOnline = onlineUsers.includes(otherMember?._id);

  const iBlockedThem = (user?.blockedUsers || [])
    .map(id => id.toString())
    .includes(otherMember?._id?.toString());

  const theyBlockedMe = (otherMember?.blockedUsers || [])
    .map(id => id.toString())
    .includes(user?._id?.toString());

  const isBlockedEither = iBlockedThem || theyBlockedMe;

  const handleUnblock = async (userId) => {
    try {
      const token = localStorage.getItem("baithak_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/friends/unblock/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('User unblocked.');
        const updatedBlocked = (user.blockedUsers || []).filter(id => id.toString() !== userId.toString());
        setUser({
          ...user,
          blockedUsers: updatedBlocked
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to unblock user.");
    }
  };

  const showToast = (msg, type = 'error') => {
    if (type === 'success') toast.success(msg);
    else toast.error(msg);
  };

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!conversation?._id) return;
    setLoading(true);
    setMessages([]);
    setTypingUsers([]);
    setPendingFile(null);

    if (socket) socket.emit("joinConversation", conversation._id);

    getMessages(conversation._id)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    inputRef.current?.focus();

    return () => {
      if (socket && conversation?._id) {
        socket.emit("leaveConversation", conversation._id);
      }
    };
  }, [conversation?._id, socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.length]);

  // Speech Recognition effect
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setText(prev => {
        const base = prev.trimEnd();
        return base ? base + ' ' + transcript : transcript;
      });
      // Auto-grow logic
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
      }
    }
  }, [transcript]);

  useEffect(() => {
    if (error === 'not-allowed') {
      toast.error('Microphone permission denied. Please allow mic access.');
    }
  }, [error]);

  // Socket: receive messages + typing + read receipts
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (newMessage) => {
      const isCurrentChat = newMessage.conversationId === conversation?._id;
      if (isCurrentChat) {
        setMessages((prev) => [...prev, newMessage]);
        onNewMessage?.(conversation._id, newMessage);
      } else {
        onNewMessage?.(newMessage.conversationId, newMessage);
      }

      // Suppress notifications if chat is current or muted
      const muted = isMuted(newMessage.conversationId);
      if (!isCurrentChat && !muted) {
        // Show browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(newMessage.senderName || newMessage.sender?.username || 'New Message', {
              body: newMessage.text || '📎 Attachment',
            });
          } catch (err) {
            console.error('Notification creation failed:', err);
          }
        }
        // Play notification sound
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.35);
          
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.35);
        } catch (e) {
          console.error('Audio beep failed', e);
        }
      }
    };

    const handleTypingStart = ({ userId }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u._id === userId)) return prev;
        const userObj = conversation.members.find((m) => m._id === userId);
        if (!userObj) return prev;
        return [...prev, userObj];
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
      }, 3000);
    };

    const handleTypingStop = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
    };

    const handleMessageRead = ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, readBy: [...(m.readBy || []), { userId, readAt: new Date().toISOString() }] }
            : m
        )
      );
    };

    const handleUserProfileUpdated = ({ userId, profilePic, bio, username }) => {
      // Update messages from this user
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender?._id === userId
            ? { ...msg, sender: { ...msg.sender, profilePic, username } }
            : msg
        )
      );

      // Update typing indicators if any
      setTypingUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, profilePic, bio, username } : u))
      );
    };

    socket.on("getMessage", handleMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:read", handleMessageRead);
    socket.on("user_profile_updated", handleUserProfileUpdated);

    return () => {
      socket.off("getMessage", handleMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:read", handleMessageRead);
      socket.off("user_profile_updated", handleUserProfileUpdated);
    };
  }, [socket, conversation?._id, otherMember?._id]);

  // ── Typing events ────────────────────────────────────────────────────────
  const handleTypingInput = (e) => {
    setText(e.target.value);
    
    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    if (!socket || !conversation?._id) return;

    socket.emit("typing:start", { conversationId: conversation._id, userId: user._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: conversation._id, userId: user._id });
    }, 2000);
  };

  const handleBlur = () => {
    if (socket && conversation?._id) {
      socket.emit("typing:stop", { conversationId: conversation._id, userId: user._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  // ── File selection / validation ──────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      showToast('File size exceeds 50MB', 'error');
      return;
    }
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag and drop ────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file); };

  // ── Send (text or file) ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (isListening) stopListening();

    const hasText = text.trim();
    const hasFile = !!pendingFile;
    if (!hasText && !hasFile) return;

    const msgText = hasText ? text.trim() : '';
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowEmoji(false);

    // Prepare reply metadata if any
    const replyData = replyingTo ? {
      id: replyingTo._id,
      senderName: replyingTo.sender?.username || (typeof replyingTo.sender === 'string' ? 'User' : 'You'),
      text: replyingTo.text || (replyingTo.messageType !== 'text' ? 'Media' : '')
    } : null;

    if (socket && conversation?._id) {
      socket.emit('typing:stop', { conversationId: conversation._id, userId: user._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    if (hasFile) {
      setUploading(true);
      setUploadProgress(10);
      try {
        const uploadResult = await uploadFile(pendingFile);
        const messageType = getMessageType(uploadResult.mimeType);
        const payload = {
          conversationId: conversation._id,
          text: msgText,
          messageType,
          replyTo: replyData,
          attachment: {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            thumbnailUrl: uploadResult.thumbnailUrl,
          },
        };
        const { data } = await sendMessageAPI(payload);
        setMessages((prev) => [...prev, data]);
        if (socket && otherMember) {
          socket.emit('sendMessage', { senderId: user._id, receiverId: otherMember._id, message: data });
        }
        onNewMessage?.(conversation._id, data);
      } catch (err) {
        showToast('Upload failed, try again', 'error');
      } finally {
        setUploading(false);
        setPendingFile(null);
        setReplyingTo(null);
      }
    } else {
      try {
        const { data } = await sendMessageAPI({ 
          conversationId: conversation._id, 
          text: msgText,
          replyTo: replyData 
        });
        setMessages((prev) => [...prev, data]);
        if (socket && otherMember) {
          socket.emit('sendMessage', { senderId: user._id, receiverId: otherMember._id, message: data });
        }
        onNewMessage?.(conversation._id, data);
      } catch {} finally {
        setReplyingTo(null);
      }
    }
  }, [text, pendingFile, conversation, user, socket, otherMember, onNewMessage, replyingTo, isListening, stopListening]);

  const handleForward = async (targetConversations) => {
    if (!forwardingMessage || !targetConversations || targetConversations.length === 0) return;

    // Fresh lookup to avoid stale closures
    const messageToForward = messages.find(m => m._id === forwardingMessage._id) || forwardingMessage;

    try {
      for (const targetConversation of targetConversations) {
        const payload = {
          conversationId: targetConversation._id,
          text: messageToForward.text || '',
          messageType: messageToForward.messageType || 'text',
          attachment: messageToForward.attachment,
          // Map for new simplified fields requested
          fileUrl: messageToForward.fileUrl || messageToForward.attachment?.url,
          fileType: messageToForward.fileType || messageToForward.attachment?.mimeType || messageToForward.messageType,
          fileName: messageToForward.fileName || messageToForward.attachment?.fileName,
          isForwarded: true
        };

        const { data } = await sendMessageAPI(payload);
        
        if (socket) {
          socket.emit('forward_message', { 
            targetChatId: targetConversation._id,
            content: messageToForward.text,
            text: messageToForward.text,
            fileUrl: payload.fileUrl,
            fileType: payload.fileType,
            fileName: payload.fileName,
            message: data
          });
        }

        if (targetConversation._id === conversation?._id) {
          setMessages(prev => [...prev, data]);
        }
        onNewMessage?.(targetConversation._id, data);
      }

      showToast(`Forwarded to ${targetConversations.length} conversation${targetConversations.length > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      console.error('Forwarding error:', err);
      showToast('Failed to forward message', 'error');
    } finally {
      setForwardingMessage(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) return null;

  return (
    <div 
      className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 h-[56px] px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0 z-10">
        <button 
          onClick={onBack}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div 
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
          onClick={() => otherMember?._id && navigate(`/profile/${otherMember._id}`)}
        >
          <div className="relative flex-shrink-0">
            <Avatar username={otherMember?.username} profilePic={otherMember?.profilePic} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineIndicator isOnline={isOtherOnline} size="sm" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[var(--text-primary)] text-[15px] truncate group-hover:text-[var(--accent)] transition-colors">
              {otherMember?.username}
            </h2>
            <p className="text-[12px] leading-tight">
              {isOtherOnline
                ? <span className="text-[var(--accent)]">● Online</span>
                : <span className="text-[var(--text-muted)]">Last seen {formatLastSeen(otherMember?.lastSeen)}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {!isBlockedEither && (
            <>
              <button 
                onClick={() => startCall({
                  _id: otherMember._id,
                  username: otherMember.username,
                  avatar: otherMember.avatar,
                  conversationId: conversation._id
                }, 'audio')}
                className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-all"
                title="Audio Call"
              >
                <Phone size={16} />
              </button>
              
              <button 
                onClick={() => startCall({
                  _id: otherMember._id,
                  username: otherMember.username,
                  avatar: otherMember.avatar,
                  conversationId: conversation._id
                }, 'video')}
                className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-all"
                title="Video Call"
              >
                <Video size={18} />
              </button>
            </>
          )}

          {/* Three dot header menu */}
          <div ref={headerMenuRef} style={{ position: 'relative', marginLeft: '4px' }}>
            <button
              onClick={() => setHeaderMenuOpen(p => !p)}
              title="More options"
              style={{
                background: headerMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', color: '#aaa', cursor: 'pointer',
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => { if (!headerMenuOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              ⋮
            </button>

            {headerMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '42px',
                background: '#1a1f2e', border: '1px solid #2d3748',
                borderRadius: '10px', padding: '6px',
                zIndex: 9999, minWidth: '180px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}>
                {[
                  { icon: '👤', label: 'View Profile', action: () => navigate(`/profile/${otherMember?._id}`), color: '#e2e8f0' },
                  { 
                    icon: isMuted(conversation?._id) ? '🔔' : '🔇', 
                    label: muteLoading ? 'Saving...' : isMuted(conversation?._id) ? 'Unmute Notifications' : 'Mute Notifications', 
                    action: async () => {
                      const previouslyMuted = isMuted(conversation?._id);
                      await toggleMute(conversation?._id);
                      showToast(previouslyMuted ? '🔔 Notifications unmuted' : '🔇 Notifications muted');
                    }, 
                    color: isMuted(conversation?._id) ? '#22d3ee' : '#e2e8f0' 
                  },
                  'divider',
                  { icon: '🗑️', label: 'Remove Friend', action: () => handleRemoveFriend(otherMember), color: '#ff9f43' },
                  { icon: '🚫', label: 'Block User', action: () => handleBlockUser(otherMember), color: '#ff6b6b' },
                ].map((item, i) =>
                  item === 'divider' ? (
                    <div key={i} style={{ height: '1px', background: '#2d3748', margin: '4px 0' }} />
                  ) : (
                    <div
                      key={i}
                      onClick={() => { setHeaderMenuOpen(false); item.action(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '7px', cursor: 'pointer',
                        color: item.color, fontSize: '13px', transition: 'background 0.15s',
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
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain">
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm">Say hello to {otherMember?.username}!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const isSameDay = prevMsg && 
              new Date(msg.createdAt).toDateString() === new Date(prevMsg.createdAt).toDateString();

            return (
              <div key={msg._id}>
                {!isSameDay && (
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">
                      {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                )}
                <Message
                  message={msg}
                  conversationId={conversation._id}
                  recipientId={otherMember?._id}
                  onReply={(m) => setReplyingTo(m)}
                  onForward={(m) => setForwardingMessage(m)}
                  onDelete={(id) => setMessages(prev => prev.map(m => m._id === id ? { ...m, deleted: true } : m))}
                />
              </div>
            )
          })
        )}
        
        {typingUsers.length > 0 && (
          <TypingIndicator members={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {isBlockedEither ? (
        <div style={{
          padding: '16px', textAlign: 'center',
          color: '#888', fontSize: '14px',
          borderTop: '1px solid #2d3748',
          background: '#0d1117',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <span>🚫</span>
          {iBlockedThem ? (
            <span>
              You blocked {otherMember?.username}.{' '}
              <span
                onClick={() => handleUnblock(otherMember._id)}
                style={{ color: '#4fd1c5', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Unblock
              </span>
            </span>
          ) : (
            <span>You can't message {otherMember?.username}.</span>
          )}
        </div>
      ) : (
        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] pb-[max(12px,env(safe-area-inset-bottom))] relative">
          {isListening && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              fontSize: '13px',
              color: '#4fd1c5',
              position: 'absolute',
              top: '-40px',
              left: '16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              zIndex: 10,
            }}>
              <span style={{ animation: 'pulse-ring 1s infinite' }}>●</span>
              Listening... tap mic to stop
            </div>
          )}
          {/* Reply Preview */}
          {replyingTo && (
            <div className="absolute bottom-full left-0 right-0 bg-[#0d1825] border-t border-[var(--border)] p-3 flex items-center gap-3 animate-slideUp">
              <div className="w-1 bg-[var(--accent)] h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--accent)] text-xs font-bold">
                  Replying to {replyingTo.sender?.username || (replyingTo.sender === user?._id ? 'You' : 'User')}
                </p>
                <p className="text-[var(--text-muted)] text-sm truncate">{replyingTo.text || 'Media'}</p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {pendingFile && (
            <FilePreview file={pendingFile} onCancel={() => setPendingFile(null)} />
          )}

          <div className="flex items-end gap-2.5">
            <div className="flex-1 min-w-0 flex items-end bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[24px] px-3 gap-2">
              <button 
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2.5 text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type a message..."
                value={text}
                onChange={handleTypingInput}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="flex-1 bg-transparent border-none outline-none py-3 text-[var(--text-secondary)] placeholder:text-[var(--text-faint)] text-[16px] leading-[1.4] resize-none max-h-[120px]"
              />

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
              >
                <PaperclipIcon />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setLanguage(lang => lang === 'en-US' ? 'hi-IN' : 'en-US')}
                className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors uppercase"
                title="Switch Language"
              >
                {language === 'en-US' ? 'EN' : 'HI'}
              </button>
              {error && error.includes('not supported') ? null : (
                <button
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? 'Stop listening' : 'Speak to type'}
                  style={{
                    background: isListening ? 'rgba(79,209,197,0.15)' : 'transparent',
                    border: isListening ? '1px solid #4fd1c5' : '1px solid transparent',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  className="hover:bg-[var(--bg-tertiary)] flex-shrink-0"
                >
                  {isListening ? (
                    <>
                      <span style={{ fontSize: '20px' }}>🎙️</span>
                      <span style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '50%',
                        border: '2px solid #4fd1c5',
                        animation: 'pulse-ring 1.2s ease-out infinite',
                      }} />
                    </>
                  ) : (
                    <span style={{ fontSize: '20px' }}>🎤</span>
                  )}
                </button>
              )}

              {(text.trim() || pendingFile || uploading) && (
                <button
                  onClick={handleSend}
                  disabled={uploading || (!text.trim() && !pendingFile)}
                  className="w-11 h-11 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] hover:bg-[var(--accent-dim)] transition-all active:scale-90 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {showEmoji && (
            <div className="absolute bottom-20 left-4 z-50">
              <EmojiPicker
                onEmojiClick={(emojiData) => setText((prev) => prev + emojiData.emoji)}
                theme="dark"
              />
            </div>
          )}
        </div>
      )}

      {isDragOver && (
        <div className="absolute inset-0 bg-[var(--accent-subtle)]/40 backdrop-blur-sm border-4 border-dashed border-[var(--accent)] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--bg-secondary)] p-8 rounded-3xl shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">Drop to send file</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Maximum 50MB</p>
          </div>
        </div>
      )}

      {forwardingMessage && (
        <ForwardModal 
          isOpen={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForward}
          currentUser={user}
          messageToForward={forwardingMessage}
        />
      )}
    </div>
  );
};

export default ChatArea;
