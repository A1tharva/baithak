import React from 'react';

const SkeletonPulse = ({ width, height, borderRadius = '8px', style = {} }) => (
  <div style={{
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, #0d1825 25%, #0e2a3d 50%, #0d1825 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    flexShrink: 0,
    ...style,
  }} />
);

const MessageSkeleton = () => (
  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {/* Received message */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      <SkeletonPulse width="32px" height="32px" borderRadius="50%" />
      <SkeletonPulse width="200px" height="40px" borderRadius="4px 16px 16px 16px" />
    </div>
    {/* Sent message */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <SkeletonPulse width="160px" height="36px" borderRadius="16px 4px 16px 16px" />
    </div>
    {/* Received message */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      <SkeletonPulse width="32px" height="32px" borderRadius="50%" />
      <SkeletonPulse width="240px" height="56px" borderRadius="4px 16px 16px 16px" />
    </div>
    {/* Sent message */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <SkeletonPulse width="120px" height="36px" borderRadius="16px 4px 16px 16px" />
    </div>
    {/* Received */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      <SkeletonPulse width="32px" height="32px" borderRadius="50%" />
      <SkeletonPulse width="180px" height="40px" borderRadius="4px 16px 16px 16px" />
    </div>
  </div>
);

export default MessageSkeleton;
