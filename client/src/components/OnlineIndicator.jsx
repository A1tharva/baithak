const OnlineIndicator = ({ isOnline, size = "sm" }) => {
  const sizeMap = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
  };

  return (
    <span
      className={`
        ${sizeMap[size] || sizeMap.sm} rounded-full flex-shrink-0
        ${isOnline
          ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
          : "bg-[var(--text-muted)] opacity-50"
        }
      `}
      title={isOnline ? "Online" : "Offline"}
    />
  );
};

export default OnlineIndicator;
