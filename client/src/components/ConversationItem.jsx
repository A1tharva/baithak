import Avatar from "./Avatar";
import OnlineIndicator from "./OnlineIndicator";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ConversationItem = ({ conversation, currentUser, isOnline, isActive, onClick }) => {
  const otherMember = conversation.members?.find(
    (m) => m._id !== currentUser?._id
  );

  const lastMsg = conversation.lastMessage;
  const isMyLastMsg = lastMsg?.sender?._id === currentUser?._id || lastMsg?.sender === currentUser?._id;

  const preview = lastMsg?.deleted
    ? "Message deleted"
    : lastMsg?.text
    ? (isMyLastMsg ? `You: ${lastMsg.text}` : lastMsg.text)
    : "Start chatting!";

  return (
    <div
      className={`chat-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {/* Avatar with online dot */}
      <div className="relative flex-shrink-0">
        <Avatar 
          username={otherMember?.username} 
          profilePic={otherMember?.profilePic} 
          size="md" 
        />
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={isOnline} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-slate-100 truncate text-sm">
            {otherMember?.username || "Unknown"}
          </span>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {formatTime(conversation.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-slate-400 truncate leading-relaxed">
            {preview}
          </p>
          {conversation.unreadCount > 0 && !isActive && (
            <span className="flex-shrink-0 bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
