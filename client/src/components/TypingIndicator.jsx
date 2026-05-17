const TypingIndicator = ({ members }) => {
  const text =
    members?.length === 1
      ? `${members[0].username} is typing...`
      : members?.length === 2
      ? `${members[0].username} and ${members[1].username} are typing...`
      : "Several people are typing...";

  return (
    <div className="flex flex-col gap-1 px-2 py-1 animate-fade-in transition-opacity duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-800/50 px-3 py-2 rounded-2xl rounded-bl-none border border-slate-700/30">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <span className="text-xs text-slate-500 font-medium italic">{text}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;
