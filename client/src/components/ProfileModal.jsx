import { useState, useRef } from 'react';
import { X, Camera, Loader2, Save } from 'lucide-react';
import { uploadFile } from '../services/uploadService';
import { updateProfile } from '../api';
import Avatar from './Avatar';
import CropModal from './CropModal';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';

const ProfileModal = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const { socket } = useSocket();
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [preview, setPreview] = useState(currentUser?.profilePic || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropDone = async (croppedBlobUrl) => {
    setShowCrop(false);
    setPreview(croppedBlobUrl + '?t=' + Date.now());
    setUploading(true);
    
    try {
      const response = await fetch(croppedBlobUrl);
      const blob = await response.blob();
      const file = new File([blob], 'profile-pic.jpg', { type: 'image/jpeg' });
      
      const result = await uploadFile(file);
      setPreview(result.url);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty.');
      return;
    }
    if (username.trim().length < 3) {
      toast.error('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setSaving(true);
    try {
      const finalPic = preview.split('?')[0];
      const { data } = await updateProfile({ 
        bio, 
        profilePic: finalPic,
        username: username.trim() 
      });
      
      onUpdate(data);
      
      // Notify other users
      if (socket) {
        socket.emit('profile_updated', {
          userId: currentUser._id,
          profilePic: finalPic,
          bio,
          username: data.username
        });
      }
      
      toast.success('Profile updated successfully!');
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-[380px] bg-[#0d1825] border border-[#0e2a3d] rounded-3xl shadow-2xl p-8 animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-6">Your Profile</h2>
          
          {/* Avatar Section */}
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '3px solid #4fd1c5',
              overflow: 'hidden',
              position: 'relative',
              margin: '0 auto 1.5rem',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'block',
            }}
          >
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
              </div>
            ) : null}

            {preview ? (
              <img
                src={preview}
                alt="avatar"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  display: 'block',
                  borderRadius: '50%',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: '#2a2f3e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                color: '#4fd1c5',
                fontWeight: 600,
              }}>
                {currentUser?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <span style={{ fontSize: '28px' }}>📷</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div className="w-full space-y-4">
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                placeholder="Display name"
                className="w-full bg-[#060d14] border border-[#0e2a3d] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  About
                </label>
                <span className={`text-[10px] ${bio.length >= 150 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                  {bio.length}/150
                </span>
              </div>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                placeholder="Tell others about yourself..."
                className="w-full bg-[#060d14] border border-[#0e2a3d] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[var(--accent)] resize-none h-24 transition-all"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || uploading}
            className={`w-full mt-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              saving || uploading 
                ? 'bg-[var(--accent)]/30 text-black/50 cursor-not-allowed' 
                : 'bg-[var(--accent)] text-black hover:scale-[1.02] active:scale-95 shadow-lg shadow-[var(--accent)]/20'
            }`}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      {showCrop && (
        <CropModal
          imageSrc={rawImage}
          onCropDone={handleCropDone}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </div>
  );
};

export default ProfileModal;
