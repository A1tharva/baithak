import "./MessageTicks.css";

const MessageTicks = ({ status, className = "" }) => {
  const grey = "var(--text-muted)";
  const blue = "var(--accent)";

  if (status === "sending") {
    return (
      <svg
        width="11"
        height="11"
        viewBox="0 0 16 16"
        fill="none"
        className={className}
      >
        <path
          d="M8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5Z"
          stroke={grey}
          strokeWidth="1.5"
        />
        <path d="M8 4V8L11 9" stroke={grey} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  const isRead = status === "read";
  const isDelivered = status === "delivered" || isRead;
  const strokeColor = isRead ? blue : grey;

  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      className={`message-ticks ${className}`}
    >
      {isDelivered ? (
        <>
          {/* Left tick */}
          <path
            d="M 0 6 L 3 9 L 7 3"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="tick-path"
          />
          {/* Right tick */}
          <path
            d="M 4 6 L 7 9 L 13 3"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="tick-path"
          />
        </>
      ) : (
        /* Single tick */
        <path
          d="M 2 5.5 L 5.5 9 L 11 2"
          stroke={grey}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tick-path"
        />
      )}
    </svg>
  );
};

export default MessageTicks;
