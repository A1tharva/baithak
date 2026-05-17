import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import EmptyChat from "../components/EmptyChat";
import { useSocket } from "../context/SocketContext";
import { useSidebarResize } from "../hooks/useSidebarResize";
import { useIsMobile } from "../hooks/useIsMobile";
import SidebarResizer from "../components/SidebarResizer";

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeMobile, setActiveMobile] = useState('sidebar'); // 'sidebar' or 'chat'
  const [showTooltip, setShowTooltip] = useState(false);

  const { socket } = useSocket();
  const { sidebarWidth, startResize, resetWidth } = useSidebarResize();
  const isMobile = useIsMobile();

  // Hide tooltip on mouseup
  useEffect(() => {
    const hide = () => setShowTooltip(false);
    window.addEventListener('mouseup', hide);
    return () => window.removeEventListener('mouseup', hide);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUserProfileUpdated = ({ userId, profilePic, bio, username }) => {
      // Update conversations list
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          members: c.members?.map((m) =>
            m._id === userId ? { ...m, profilePic, bio, username } : m
          ),
        }))
      );

      // Update active conversation if it's the one changed
      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members?.map((m) =>
            m._id === userId ? { ...m, profilePic, bio, username } : m
          ),
        };
      });
    };

    const handleUnreadUpdate = ({ conversationId, count }) => {
      if (conversationId === activeConversation?._id) return;
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: count } : c
        )
      );
    };

    socket.on("user_profile_updated", handleUserProfileUpdated);
    socket.on("unread:update", handleUnreadUpdate);

    return () => {
      socket.off("user_profile_updated", handleUserProfileUpdated);
      socket.off("unread:update", handleUnreadUpdate);
    };
  }, [socket, activeConversation?._id]);

  useEffect(() => {
    const totalUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Baithak`;
    } else {
      document.title = "Baithak";
    }
  }, [conversations]);

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv);
    setActiveMobile('chat');

    // Clear unread count for selected conversation
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );

    // Call API to mark as read persistently
    try {
      const token = localStorage.getItem("baithak_token");
      await fetch(`/api/conversations/${conv._id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  const handleNewMessage = (convId, newMessage) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c._id === convId) {
          const isActive = activeConversation?._id === convId;
          return {
            ...c,
            lastMessage: newMessage,
            updatedAt: new Date().toISOString(),
            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });
      return [...updated].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      <style>{`
        @media (max-width: 768px) {
          .sidebar-panel {
            position: absolute;
            width: 100%; height: 100%;
            z-index: 10;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-panel.hidden-mobile { transform: translateX(-100%); }

          .chat-panel {
            position: absolute;
            width: 100%; height: 100%;
            z-index: 20;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .chat-panel.hidden-mobile { transform: translateX(100%); }
        }
      `}</style>

      {/* Sidebar */}
      <div
        className={`
          sidebar-panel
          ${activeMobile === 'sidebar' ? '' : 'hidden-mobile'}
          flex-shrink-0 md:relative md:transform-none
        `}
        style={{
          width: isMobile ? '100%' : `${sidebarWidth}px`,
          minWidth: isMobile ? '100%' : `${sidebarWidth}px`,
          maxWidth: isMobile ? '100%' : `${sidebarWidth}px`,
          height: '100%',
          overflow: 'hidden',
          transition: 'none',
        }}
      >
        <Sidebar
          activeConvId={activeConversation?._id}
          onSelectConversation={handleSelectConversation}
          conversations={conversations}
          setConversations={setConversations}
        />
      </div>

      {/* RESIZER HANDLE — desktop only */}
      {!isMobile && (
        <SidebarResizer
          onMouseDown={(e) => {
            startResize(e);
            setShowTooltip(true);
          }}
          onDoubleClick={resetWidth}
        />
      )}

      {/* Tooltip JSX */}
      {showTooltip && !isMobile && (
        <div style={{
          position: 'fixed',
          left: `${sidebarWidth + 12}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#0d1825',
          border: '1px solid #0e2a3d',
          color: '#22d3ee',
          fontSize: '11px',
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: '6px',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {sidebarWidth}px
        </div>
      )}

      {/* Chat Area */}
      <div className={`
        chat-panel
        ${activeMobile === 'chat' ? '' : 'hidden-mobile'}
        flex-1 flex flex-col min-w-0
        md:relative md:transform-none
      `}>
        {activeConversation ? (
          <ChatArea
            key={activeConversation._id}
            conversation={activeConversation}
            onNewMessage={handleNewMessage}
            onBack={() => setActiveMobile('sidebar')}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

export default Chat;
