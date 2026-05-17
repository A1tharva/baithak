import { useState, useEffect } from 'react';
import { X, Search, Send } from 'lucide-react';
import { getUserConversations } from '../api';
import Avatar from './Avatar';

const ForwardModal = ({ isOpen, onClose, onForward, currentUser, messageToForward }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const getForwardPreview = (msg) => {
    if (!msg) return '';
    const type = msg.fileType || msg.messageType || (msg.attachment?.mimeType);
    const name = msg.fileName || msg.attachment?.fileName;
    if (type?.startsWith('image/')) return `📷 ${name || 'Photo'}`;
    if (type?.startsWith('video/')) return `🎥 ${name || 'Video'}`;
    if (type?.startsWith('audio/')) return `🎵 ${name || 'Audio'}`;
    if (type || msg.attachment) return `📎 ${name || 'File'}`;
    return msg.text || '';
  };

  useEffect(() => {
    if (isOpen) {
      const fetchChats = async () => {
        setLoading(true);
        try {
          const { data } = await getUserConversations(currentUser._id);
          setConversations(data || []);
        } catch (err) {
          console.error('Error fetching chats:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchChats();
    }
  }, [isOpen, currentUser._id]);

  const filteredChats = (conversations || []).filter(conv => {
    const members = conv.participants || conv.members || [];
    const otherUser = members.find(p => p?._id !== currentUser?._id);
    return otherUser?.username?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleChat = (chatId) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId) 
        : [...prev, chatId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedChatIds.length === filteredChats.length) {
      setSelectedChatIds([]);
    } else {
      setSelectedChatIds(filteredChats.map(c => c._id));
    }
  };

  const handleForward = () => {
    const selectedConversations = conversations.filter(c => selectedChatIds.includes(c._id));
    onForward(selectedConversations);
    onClose();
    setSelectedChatIds([]);
    setSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0d1825] border border-[#0e2a3d] rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-4 border-b border-[#0e2a3d] flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Forward Message</h3>
            <p className="text-[11px] text-[var(--accent)] font-medium truncate max-w-[280px]">
              {getForwardPreview(messageToForward)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text"
              placeholder="Search chats..."
              className="w-full bg-[#060d14] border border-[#0e2a3d] rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredChats.length > 0 && (
            <div className="flex items-center justify-between px-2 mb-2">
              <button 
                onClick={toggleSelectAll}
                className="text-xs text-[var(--accent)] font-medium hover:underline"
              >
                {selectedChatIds.length === filteredChats.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-[10px] text-[var(--text-muted)]">
                {selectedChatIds.length} selected
              </span>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {loading ? (
              <div className="py-8 text-center text-[var(--text-muted)]">Loading chats...</div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map(conv => {
                const members = conv.participants || conv.members || [];
                const otherUser = members.find(p => p?._id !== currentUser?._id);
                if (!otherUser) return null;
                const isSelected = selectedChatIds.includes(conv._id);

                return (
                  <div
                    key={conv._id}
                    onClick={() => toggleChat(conv._id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' 
                        : 'bg-[#060d14]/30 border border-transparent hover:bg-[#0d1825] hover:border-[#0e2a3d]'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar username={otherUser?.username} size="sm" />
                      {isSelected && (
                        <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center border-2 border-[#0d1825]">
                          <Send size={8} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-medium truncate">{otherUser?.username}</p>
                      <p className="text-[var(--text-muted)] text-[11px] truncate">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-[var(--accent)] border-[var(--accent)]' 
                        : 'bg-transparent border-[#2d4a63]'
                    }`}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-black">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-[var(--text-muted)] text-sm italic">No chats found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#060d14]/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold text-white bg-[#0d1825] border border-[#0e2a3d] hover:bg-[#0e2a3d] transition-colors"
          >
            Cancel
          </button>
          <button 
            disabled={selectedChatIds.length === 0}
            onClick={handleForward}
            className={`flex-1 py-3 rounded-2xl font-bold text-black transition-all ${
              selectedChatIds.length > 0 
                ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 active:scale-95' 
                : 'bg-[var(--accent)]/30 opacity-40 cursor-not-allowed'
            }`}
          >
            Forward {selectedChatIds.length > 0 && `(${selectedChatIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
