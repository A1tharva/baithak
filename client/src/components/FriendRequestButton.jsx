import { useState } from 'react';
import { sendFriendRequest } from '../api';
import toast from 'react-hot-toast';

const FriendRequestButton = ({ user, onAction }) => {
  const [loading, setLoading] = useState(false);

  if (user.isFriend) {
    return (
      <span style={{
        fontSize: '12px', color: '#4fd1c5',
        border: '1px solid #4fd1c5',
        borderRadius: '6px', padding: '5px 12px',
      }}>
        ✓ Friends
      </span>
    );
  }

  if (user.friendRequestStatus === 'pending' && user.friendRequestSentByMe) {
    return (
      <span style={{ fontSize: '12px', color: '#888', padding: '6px 12px' }}>
        Requested
      </span>
    );
  }

  if (user.friendRequestStatus === 'pending' && !user.friendRequestSentByMe) {
    return (
      <span style={{ fontSize: '12px', color: '#f9ca24', padding: '6px 12px' }}>
        Wants to add you
      </span>
    );
  }

  const handleSendRequest = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await sendFriendRequest(user._id);
      toast.success('Friend request sent!');
      if (onAction) onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleSendRequest} 
      disabled={loading} 
      style={{
        background: '#4fd1c5', border: 'none', borderRadius: '8px',
        padding: '6px 14px', color: '#0d1117', fontWeight: 600,
        fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '...' : '+ Add'}
    </button>
  );
};

export default FriendRequestButton;
