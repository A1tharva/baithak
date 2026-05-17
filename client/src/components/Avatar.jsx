// Generates colorful avatar initials based on username

const COLORS = [
  "from-teal-500 to-teal-700",
  "from-violet-500 to-violet-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
  "from-sky-500 to-sky-700",
  "from-emerald-500 to-emerald-700",
  "from-pink-500 to-pink-700",
  "from-indigo-500 to-indigo-700",
];

const getColor = (name = "") => {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const sizeMap = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-14 h-14 text-xl",
  xl: "w-16 h-16 text-2xl",
  "2xl": "w-32 h-32 text-5xl",
};

const Avatar = ({ username = "", profilePic = "", size = "md", className = "", showRing = false }) => {
  const color = getColor(username);
  const initials = getInitials(username);
  const sizeClass = sizeMap[size] || sizeMap.md;

  if (profilePic) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className} ${showRing ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#0d1825]" : ""}`}>
        <img 
          src={profilePic} 
          alt={username} 
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={`
        ${sizeClass} rounded-full bg-gradient-to-br ${color}
        flex items-center justify-center font-display font-bold text-white select-none flex-shrink-0
        ${showRing ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#0d1825]" : ""}
        ${className}
      `}
      title={username}
    >
      {initials}
    </div>
  );
};

export default Avatar;
