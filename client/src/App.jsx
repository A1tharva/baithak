import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { MuteProvider } from "./context/MuteContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import AuthCallback from "./pages/AuthCallback";
import OAuthSuccess from "./pages/OAuthSuccess";

import ErrorBoundary from "./components/ErrorBoundary";
import ProfileView from "./components/ProfileView";
import { useWebRTC } from "./context/WebRTCContext";
import { WebRTCProvider } from "./context/WebRTCContext";
import IncomingCall from "./components/IncomingCall";
import OutgoingCall from "./components/OutgoingCall";
import VideoCall from "./components/VideoCall";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <MuteProvider>
        <SocketProvider>
          <WebRTCProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </WebRTCProvider>
        </SocketProvider>
      </MuteProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const {
    callState, localStream, remoteStream,
    callInfo, isMuted, isCameraOff,
    callDuration, formatDuration, error,
    acceptCall, rejectCall, endCall, 
    toggleMute, toggleCamera, flipCamera,
  } = useWebRTC();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  return (
    <ErrorBoundary>
            <Toaster 
              position="top-center" 
              toastOptions={{ 
                duration: 2500,
                style: {
                  background: '#1a1f2e',
                  color: '#e2e8f0',
                  border: '1px solid #2d3748',
                  borderRadius: '10px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#4fd1c5', secondary: '#1a1f2e' },
                },
                error: {
                  iconTheme: { primary: '#ff6b6b', secondary: '#1a1f2e' },
                },
              }} 
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <ProfileView />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* WebRTC Overlays */}
            {callState === 'incoming' && (
              <IncomingCall
                callInfo={callInfo}
                onAccept={() => acceptCall(callInfo)}
                onReject={() => rejectCall(callInfo.from)}
              />
            )}

            {callState === 'calling' && (
              <OutgoingCall
                callInfo={callInfo}
                onEnd={() => endCall(callInfo.userId)}
              />
            )}

            {(callState === 'connected' || callState === 'connecting') && (
              <VideoCall
                localStream={localStream}
                remoteStream={remoteStream}
                callInfo={callInfo}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                callDuration={callDuration}
                formatDuration={formatDuration}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onFlipCamera={flipCamera}
                onEnd={() => endCall(callInfo.userId)}
              />
            )}

            {error && (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce">
                {error}
              </div>
            )}
    </ErrorBoundary>
  );
}

export default App;
