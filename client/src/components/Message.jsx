import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { deleteMessage } from "../api";
import Avatar from "./Avatar";
import MessageTicks from "./MessageTicks";
import ImageLightbox from "./ImageLightbox";
import { formatFileSize } from "../services/uploadService";

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// ── Inline file-type icon ────────────────────────────────────────────────────
const FileTypeIcon = ({ mimeType, fileName }) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';

  if (mimeType?.includes('pdf') || ext === 'pdf')
    return (
      <svg width="22" height="22" fill="none" stroke="#f87171" strokeWidth="1.8"
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );

  if (mimeType?.includes('word') || ext === 'doc' || ext === 'docx')
    return (
      <svg width="22" height="22" fill="none" stroke="#60a5fa" strokeWidth="1.8"
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );

  if (mimeType?.includes('zip') || ext === 'zip')
    return (
      <svg width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="1.8"
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    );

  if (mimeType?.startsWith('audio/') || ext === 'mp3')
    return (
      <svg width="22" height="22" fill="none" stroke="#a78bfa" strokeWidth="1.8"
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );

  if (mimeType?.startsWith('video/') || ext === 'mp4')
    return (
      <svg width="22" height="22" fill="none" stroke="#34d399" strokeWidth="1.8"
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );

  return (
    <svg width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="1.8"
      viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
};

// ── Download icon ────────────────────────────────────────────────────────────
const DownloadIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const MusicIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#a78bfa" strokeWidth="2"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#34d399" strokeWidth="2"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

// ── Timestamp + ticks inline element ─────────────────────────────────────────
const MetaLine = ({ createdAt, isSent, status }) => (
  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] float-right ml-2 mt-1">
    {formatTime(createdAt)}
    {isSent && (
      <span style={{ color: status === 'read' ? 'var(--accent)' : 'inherit' }}>
        <MessageTicks status={status} />
      </span>
    )}
  </span>
);

// ── Image message ─────────────────────────────────────────────────────────────
const ImageMessage = ({ message, isSent, status }) => {
  const url = message.fileUrl || message.attachment?.url;
  const name = message.fileName || message.attachment?.fileName;
  const { text, createdAt } = message;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <div style={{
      display: 'inline-block',
      maxWidth: '300px',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {message.isForwarded && (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '4px', padding: '4px' }}>
          ↪ Forwarded
        </div>
      )}
      {message.replyTo && <QuoteMessage replyTo={message.replyTo} />}
      <div 
        className={`relative rounded-[12px] overflow-hidden bg-[var(--bg-elevated)] cursor-zoom-in group`}
        onClick={() => setLightbox(true)}
      >
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
        <img
          src={url}
          alt={name || 'image'}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '350px',
            width: 'auto',
            height: 'auto',
            borderRadius: '12px',
          }}
          className={`transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="px-1 py-1">
        {text && <p className="text-[14px] text-[var(--text-primary)] leading-normal mb-1">{text}</p>}
        <MetaLine createdAt={createdAt} isSent={isSent} status={status} />
      </div>
      {lightbox && (
        <ImageLightbox url={url} fileName={name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
};

// ── Video message ─────────────────────────────────────────────────────────────
const VideoMessage = ({ message, isSent, status }) => {
  const url = message.fileUrl || message.attachment?.url;
  const thumb = message.attachment?.thumbnailUrl;
  const { text, createdAt } = message;
  const name = message.fileName || message.attachment?.fileName;

  return (
    <div style={{
      display: 'inline-block',
      maxWidth: '320px',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {message.isForwarded && (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '4px', padding: '4px' }}>
          ↪ Forwarded
        </div>
      )}
      {message.replyTo && <QuoteMessage replyTo={message.replyTo} />}
      <div className="relative rounded-[12px] overflow-hidden bg-black">
        <video
          src={url}
          poster={thumb}
          controls
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '400px',
            width: 'auto',
            height: 'auto',
            borderRadius: '12px',
          }}
        />
        {name && (
          <div style={{
            fontSize: '11px',
            color: '#888',
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '0 0 12px 12px',
          }}>
            {name}
          </div>
        )}
      </div>
      <div className="px-1 py-1">
        {text && <p className="text-[14px] text-[var(--text-primary)] leading-normal mb-1">{text}</p>}
        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-[var(--text-faint)]">
            {message.attachment?.fileSize ? formatFileSize(message.attachment.fileSize) : 'Video'}
          </span>
          <MetaLine createdAt={createdAt} isSent={isSent} status={status} />
        </div>
      </div>
    </div>
  );
};

// ── Audio message ─────────────────────────────────────────────────────────────
const AudioMessage = ({ message, isSent, status }) => {
  const url = message.fileUrl || message.attachment?.url;
  const { createdAt } = message;

  return (
    <div className={`min-w-[240px] p-2 rounded-[var(--radius-md)] ${isSent ? 'bg-[var(--bubble-sent)]' : 'bg-[var(--bubble-recv)]'}`}>
      {message.isForwarded && (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '4px' }}>
          ↪ Forwarded
        </div>
      )}
      {message.replyTo && <QuoteMessage replyTo={message.replyTo} />}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <MusicIcon />
        </div>
        <audio src={url} controls className="w-full h-8" />
      </div>
      <div className="flex justify-between items-center px-1 mt-1">
        <span className="text-[10px] text-[var(--text-muted)]">
          {message.attachment?.fileSize ? formatFileSize(message.attachment.fileSize) : 'Audio'}
        </span>
        <MetaLine createdAt={createdAt} isSent={isSent} status={status} />
      </div>
    </div>
  );
};

// ── File message ──────────────────────────────────────────────────────────────
const FileMessage = ({ message, isSent, status }) => {
  const url = message.fileUrl || message.attachment?.url;
  const name = message.fileName || message.attachment?.fileName;
  const type = message.fileType || message.attachment?.mimeType;
  const { createdAt } = message;
  const ext = name?.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className="min-w-[220px] p-3 rounded-[var(--radius-md)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex flex-col gap-2">
      {message.isForwarded && (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '4px' }}>
          ↪ Forwarded
        </div>
      )}
      {message.replyTo && <QuoteMessage replyTo={message.replyTo} />}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bubble-sent)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <FileTypeIcon mimeType={type} fileName={name} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{name}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {message.attachment?.fileSize ? `${formatFileSize(message.attachment.fileSize)} · ` : ''}{ext}
          </p>
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[var(--accent)] hover:text-[var(--accent-dim)] transition-colors"
        >
          <DownloadIcon />
        </a>
      </div>
      <MetaLine createdAt={createdAt} isSent={isSent} status={status} />
    </div>
  );
};

import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, MoreVertical, Copy, Reply, Forward, X } from "lucide-react";

// ── Quoted message (Reply) ───────────────────────────────────────────────────
const QuoteMessage = ({ replyTo }) => {
  if (!replyTo) return null;
  return (
    <div 
      className="cursor-pointer hover:bg-white/10 transition-colors overflow-hidden"
      style={{
        borderLeft: '3px solid #4fd1c5',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '4px',
        padding: '6px 10px',
        marginBottom: '6px',
        fontSize: '12px',
        maxWidth: '100%',
      }}
      onClick={(e) => {
        e.stopPropagation();
        const el = document.getElementById(`msg-${replyTo.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
    >
      <div style={{ color: '#4fd1c5', fontWeight: 600, marginBottom: '2px' }}>
        Replying to {replyTo.senderName}
      </div>
      <div style={{
        color: '#888',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {replyTo.text}
      </div>
    </div>
  );
};

// ── Call record message ──────────────────────────────────────────────────────
const CallMessage = ({ message, isSent }) => {
  const { callData, createdAt } = message;
  const isVideo = callData?.type === 'video';
  const status = callData?.status;
  
  const getCallConfig = () => {
    if (status === 'missed') return { icon: PhoneMissed, text: 'Missed', color: '#ef4444' };
    if (status === 'rejected') return { icon: PhoneMissed, text: 'Declined', color: '#94a3b8' };
    if (status === 'busy') return { icon: PhoneMissed, text: 'User busy', color: '#94a3b8' };
    
    const duration = callData?.duration || 0;
    const m = Math.floor(duration / 60).toString().padStart(2, '0');
    const s = (duration % 60).toString().padStart(2, '0');
    
    return { 
      icon: isVideo ? Video : Phone, 
      text: isVideo ? `Video call · ${m}:${s}` : `Audio call · ${m}:${s}`,
      color: 'var(--accent)'
    };
  };

  const config = getCallConfig();
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center py-2 px-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl my-2 mx-auto max-w-[240px] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-[var(--bg-tertiary)]" style={{ color: config.color }}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">{config.text}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
};

// ── Text message ──────────────────────────────────────────────────────────
const TextMessage = ({ message, isSent, status }) => (
  <div className="relative">
    {message.isForwarded && (
      <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginBottom: '4px' }}>
        ↪ Forwarded
      </div>
    )}
    {message.replyTo && <QuoteMessage replyTo={message.replyTo} />}
    <p className="text-[14.5px] text-[var(--text-primary)] leading-normal break-words whitespace-pre-wrap">
      {message.text}
      <MetaLine createdAt={message.createdAt} isSent={isSent} status={status} />
    </p>
  </div>
);

// ── Context Menu ─────────────────────────────────────────────────────────────
const MessageContextMenu = ({ isSent, onAction, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className={`
        absolute z-[1000] min-w-[140px] bg-[#1a2c3d] border border-[#2d4a63] rounded-xl shadow-2xl py-1 animate-scaleIn
        ${isSent ? 'right-full mr-2' : 'left-full ml-2'} top-0
      `}
    >
      <button 
        onClick={() => { onAction('copy'); onClose(); }}
        className="w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-150"
      >
        <Copy size={16} /> Copy
      </button>
      <button 
        onClick={() => { onAction('reply'); onClose(); }}
        className="w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-150"
      >
        <Reply size={16} /> Reply
      </button>
      <button 
        onClick={() => { onAction('forward'); onClose(); }}
        className="w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-150"
      >
        <Forward size={16} /> Forward
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Message = ({ message, conversationId, recipientId, onReply, onForward, onDelete }) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  
  const isSent = message.sender?._id === user?._id || message.sender === user?._id;
  const messageRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const pressTimer = useRef(null);

  // Global click listener to close menu
  useEffect(() => {
    const handler = () => setShowMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const isReadByOthers = message.readBy?.some((r) => r.userId !== user?._id);
  
  let status = "sent";
  if (message._id?.toString().startsWith("temp_")) {
    status = "sending";
  } else if (isReadByOthers) {
    status = "read";
  } else if (recipientId && onlineUsers.includes(recipientId)) {
    status = "delivered";
  }

  const handleAction = (action) => {
    if (action === 'copy') {
      navigator.clipboard.writeText(message.text);
    } else if (action === 'reply') {
      onReply(message);
    } else if (action === 'forward') {
      onForward(message);
    }
  };

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Mobile long-press detection
  const handleTouchStart = (e) => {
    if (type === 'call') return;
    pressTimer.current = setTimeout(() => openMenu(e), 500);
  };
  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Intersection Observer for read receipts
  useEffect(() => {
    if (isSent || !socket || !conversationId || message.deleted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isRead = message.readBy?.some((r) => r.userId === user?._id);
        if (entry.isIntersecting && !isRead) {
          socket.emit("message:read", {
            messageId: message._id,
            userId: user._id,
            conversationId,
          });
        }
      },
      { threshold: 1.0 }
    );
    if (messageRef.current) observer.observe(messageRef.current);
    return () => observer.disconnect();
  }, [message._id, isSent, socket, conversationId, user?._id, message.readBy, message.deleted]);

  if (message.deleted) {
    return (
      <div className={`flex flex-col ${isSent ? "items-end" : "items-start"} mb-1`}>
        <span className="text-[var(--text-muted)] text-[12px] italic px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)]">
          Message deleted
        </span>
      </div>
    );
  }

  const type = message.messageType || 'text';
  const isMediaOrFile = ['image', 'gif', 'file', 'video', 'audio'].includes(type);

  return (
    <div 
      ref={messageRef}
      id={`msg-${message._id}`}
      className={`flex flex-col group relative ${type === 'call' ? "items-center w-full" : (isSent ? "items-end" : "items-start")} mb-1 animate-fadeIn`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isSent && type !== 'call' && (
          <div className="flex-shrink-0 mb-1">
            <Avatar 
              username={message.sender?.username} 
              profilePic={message.sender?.profilePic} 
              size="xs" 
            />
          </div>
        )}
        <div className={`relative flex items-center flex-1`}>
        {/* Action Button (⋮) - Absolutely positioned next to bubble */}
        {type !== 'call' && (
          <button 
            onClick={openMenu}
            className={`
              absolute top-1/2 -translate-y-1/2 z-10
              opacity-0 group-hover:opacity-100 p-1.5 rounded-full 
              bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] 
              hover:text-white hover:bg-white/10 hover:border-[var(--accent)] shadow-lg 
              transition-all duration-150 cursor-pointer
              ${isSent ? 'left-[-32px]' : 'right-[-32px]'}
            `}
          >
            <MoreVertical size={16} />
          </button>
        )}

        <div 
          className={`
            relative rounded-[var(--radius-lg)] px-3 py-2 border transition-all duration-200 w-fit inline-block
            ${isSent 
              ? "bg-[var(--bubble-sent)] border-[var(--border-strong)] rounded-tr-[4px]" 
              : "bg-[var(--bubble-recv)] border-[var(--border)] rounded-tl-[4px]"
            }
            ${isMediaOrFile || type === 'call' ? "!p-0 !bg-transparent !border-none max-w-full" : ""}
          `}
        >
          {message.deleted ? (
            <span className="text-[var(--text-muted)] italic text-sm">Message deleted</span>
          ) : (
            <>
              {type === 'image' || type === 'gif' ? (
                <ImageMessage message={message} isSent={isSent} status={status} />
              ) : type === 'video' ? (
                <VideoMessage message={message} isSent={isSent} status={status} />
              ) : type === 'audio' ? (
                <AudioMessage message={message} isSent={isSent} status={status} />
              ) : type === 'file' ? (
                <FileMessage message={message} isSent={isSent} status={status} />
              ) : type === 'call' ? (
                <CallMessage message={message} isSent={isSent} />
              ) : (
                <TextMessage message={message} isSent={isSent} status={status} />
              )}

              {/* Anchored Context Menu */}
              {showMenu && (
                <MessageContextMenu 
                  isSent={isSent}
                  onAction={handleAction} 
                  onClose={() => setShowMenu(false)} 
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {isSent && message.readBy?.length > 0 && (
        <div className="flex items-center gap-1 mt-1 px-1">
          <div className="flex -space-x-1.5">
            {message.readBy.filter(r => r.userId !== user?._id).slice(0, 3).map((r) => (
              <div key={r.userId} className="w-4 h-4 rounded-full border border-[var(--bg-primary)] overflow-hidden bg-[var(--bg-tertiary)]">
                <Avatar username={r.username} profilePic={r.profilePic} size="xs" />
              </div>
            ))}
          </div>
          {message.readBy.filter(r => r.userId !== user?._id).length > 3 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              +{message.readBy.filter(r => r.userId !== user?._id).length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
