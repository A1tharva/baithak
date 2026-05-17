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

const ConversationSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    margin: '0 6px 2px',
  }}>
    <SkeletonPulse width="40px" height="40px" borderRadius="50%" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <SkeletonPulse width="60%" height="13px" />
      <SkeletonPulse width="80%" height="11px" />
    </div>
    <SkeletonPulse width="32px" height="11px" />
  </div>
);

const SidebarSkeleton = () => (
  <div style={{ padding: '8px 0' }}>
    {/* Search bar skeleton */}
    <div style={{ margin: '12px 12px 16px' }}>
      <SkeletonPulse width="100%" height="36px" borderRadius="20px" />
    </div>
    {/* Section label */}
    <SkeletonPulse width="80px" height="10px" borderRadius="4px" 
      style={{ margin: '0 16px 8px' }} />
    {/* Conversation items */}
    {[1,2,3,4,5].map(i => <ConversationSkeleton key={i} />)}
  </div>
);

export default SidebarSkeleton;
