import { createContext, useContext } from 'react';
import { useWebRTC as useWebRTCHook } from '../hooks/useWebRTC';

const WebRTCContext = createContext(null);

export const WebRTCProvider = ({ children }) => {
  const webrtc = useWebRTCHook();

  return (
    <WebRTCContext.Provider value={webrtc}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error("useWebRTC must be used within WebRTCProvider");
  return context;
};
