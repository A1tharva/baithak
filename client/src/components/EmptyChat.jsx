import React from 'react';

const EmptyChat = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '20px',
    padding: '40px',
    textAlign: 'center',
    background: 'var(--bg-primary)',
  }}>
    <div style={{
      width: '88px',
      height: '88px',
      borderRadius: '50%',
      background: '#083344',
      border: '2px solid #155e7a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '40px',
      animation: 'pulse-glow 2s ease-in-out infinite',
    }}>
      💬
    </div>

    <div>
      <h2 style={{
        fontSize: '22px',
        fontWeight: 700,
        color: '#e2f0ff',
        margin: '0 0 8px',
      }}>
        Bai<span style={{ color: '#22d3ee' }}>thak</span>
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#475569',
        margin: '0 0 4px',
        maxWidth: '280px',
      }}>
        Select a conversation to start chatting
      </p>
      <p style={{
        fontSize: '12px',
        color: '#334155',
        margin: 0,
      }}>
        Messages are real-time and end-to-end
      </p>
    </div>

    {/* Feature pills */}
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {['⚡ Real-time', '📎 File sharing', '📹 Video calls'].map(f => (
        <span key={f} style={{
          padding: '6px 14px',
          background: '#0d1825',
          border: '1px solid #0e2a3d',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#64748b',
        }}>
          {f}
        </span>
      ))}
    </div>
  </div>
);

export default EmptyChat;
