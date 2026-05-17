import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import OnlineIndicator from './OnlineIndicator';

const safe = (value, fallback = '') => value ?? fallback;

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ProfileView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/users/${userId}`,
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('baithak_token')}` 
            }
          }
        );

        if (!res.ok) throw new Error('Failed to load profile');
        
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[var(--bg-primary)] text-[var(--text-muted)]">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)] gap-4 text-[var(--text-muted)]">
      <div className="w-20 h-20 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-4xl">👤</div>
      <p>Could not load profile</p>
      <button 
        onClick={() => navigate(-1)}
        className="px-6 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[var(--radius-md)] transition-colors border border-[var(--border)]"
      >
        Go back
      </button>
    </div>
  );

  if (!profile) return null;

  const avatarInitial = (profile.username || profile.name || '?').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border)]">
        {/* Header Gradient */}
        <div style={{
          background: 'linear-gradient(180deg, #0f4c5c 0%, #0d1117 100%)',
          height: '120px',
          borderRadius: '12px 12px 0 0',
          position: 'relative',
        }}>
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-all border border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8 -mt-16 flex flex-col items-center text-center">
          <div className="relative group">
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid var(--bg-secondary)',
              margin: '0 auto',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}>
              {profile?.profilePic ? (
                <img
                  src={profile.profilePic}
                  alt={profile.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: 'var(--bg-primary)',
                }}>
                  {avatarInitial}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 ring-4 ring-[var(--bg-secondary)] rounded-full">
              <OnlineIndicator isOnline={profile.isOnline} size="md" />
            </div>
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {safe(profile.username || profile.name, 'Unknown User')}
          </h2>
          
          <p className="text-sm mt-1.5">
            {profile.isOnline ? (
              <span className="text-[var(--accent)] font-semibold uppercase tracking-widest text-[11px]">● Online Now</span>
            ) : (
              <span className="text-[var(--text-muted)] font-medium">
                {profile.lastSeen ? `Active ${formatTime(profile.lastSeen)}` : 'Offline'}
              </span>
            )}
          </p>

          <div className="w-full mt-8 space-y-5 text-left">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">About</h3>
              <p className="text-[var(--text-primary)] text-[14px] leading-relaxed">
                {safe(profile.bio || profile.about, 'Hey there! I am using Baithak.')}
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Email</h3>
              <p className="text-[var(--text-secondary)] text-[13px] break-all select-all font-medium">
                {safe(profile.email, 'Not shared')}
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Joined</h3>
              <p className="text-[var(--text-secondary)] text-[13px] font-medium">
                {new Date(profile.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate(-1)}
            className="w-full mt-8 py-4 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--bg-primary)] font-extrabold rounded-[var(--radius-md)] transition-all shadow-xl shadow-[var(--accent)]/10 transform active:scale-[0.98]"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
