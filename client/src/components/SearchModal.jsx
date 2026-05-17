import { useState, useEffect, useRef } from "react";
import { searchFriends } from "../api";
import Avatar from "./Avatar";
import OnlineIndicator from "./OnlineIndicator";
import { useSocket } from "../context/SocketContext";
import FriendRequestButton from "./FriendRequestButton";

const SearchModal = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const { onlineUsers } = useSocket();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validateSearchQuery = (query) => {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const isEmailFormat = trimmed.includes('@');

    if (isEmailFormat) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return 'Invalid email format.';
      }
    } else {
      if (trimmed.length < 2) {
        return 'Enter at least 2 characters.';
      }
      if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
        return 'Username can only contain letters, numbers, dots, and underscores.';
      }
    }
    return null;
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    const err = validateSearchQuery(val);
    setSearchError(err);
    if (err || val.trim().length < 2) {
      setResults([]);
    }
  };

  useEffect(() => {
    if (!query.trim() || searchError || query.trim().length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchFriends(query);
        setResults(data);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchError]);

  const refreshSearch = async () => {
    if (!query.trim()) return;
    try {
      const { data } = await searchFriends(query);
      setResults(data);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users by name or email..."
              value={query}
              onChange={handleSearchChange}
              className={`flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none ${searchError ? 'border-b border-[#ff6b6b]' : ''}`}
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchError(null); setResults([]); }} className="text-slate-400 hover:text-slate-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {searchError && (
            <div style={{ fontSize: '12px', color: '#ff6b6b', padding: '4px 12px', marginTop: '4px' }}>
              {searchError}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && !searchError && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No users found for "{query}"</p>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">Type to search for users</p>
            </div>
          )}

          {results.map((user) => (
            <div
              key={user._id}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar username={user.username} profilePic={user.profilePic} size="md" />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineIndicator isOnline={onlineUsers.includes(user._id)} size="xs" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100 text-sm">{user.username}</p>
                <p className="text-xs text-slate-400 truncate">{user.bio || 'No bio'}</p>
              </div>
              <FriendRequestButton user={user} onAction={refreshSearch} />
            </div>
          ))}
        </div>

        {/* Close hint */}
        <div className="px-4 py-3 border-t border-slate-700/50 text-center">
          <kbd className="text-xs text-slate-500">Press ESC or click outside to close</kbd>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
