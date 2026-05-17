import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff,
  PhoneOff, RefreshCw, Volume2, VolumeX, ArrowLeft
} from 'lucide-react';
import Avatar from './Avatar';

const VideoCall = ({
  localStream, remoteStream, callInfo,
  isMuted, isCameraOff, callDuration, formatDuration,
  onToggleMute, onToggleCamera, onFlipCamera, onEnd
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Auto-hide controls
  useEffect(() => {
  if (remoteVideoRef.current && remoteStream) {
    remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => setTimeout(() => remoteVideoRef.current?.play(), 500));
    remoteVideoRef.current.play().catch(err => {
      console.warn('Autoplay blocked, retrying...', err);
      setTimeout(() => {
        remoteVideoRef.current?.play().catch(console.error);
      }, 1000);
    });
  }
}, [remoteStream]);

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ✅ FIX: Attach local stream via ref (always runs, ref always exists)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ✅ FIX: Attach remote stream via ref (always runs, ref always exists now)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => setTimeout(() => remoteVideoRef.current?.play(), 500));
    }
  }, [remoteStream]);

  // Handle speaker/volume
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isSpeakerOn ? 1.0 : 0.2;
    }
  }, [isSpeakerOn]);

  // Dragging logic for local video
  const handleDragStart = (e) => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const newX = window.innerWidth - clientX - 60;
    const newY = window.innerHeight - clientY - 80;
    setPipPosition({
      x: Math.max(10, Math.min(newX, window.innerWidth - 130)),
      y: Math.max(10, Math.min(newY, window.innerHeight - 170))
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col"
      onMouseMove={handleDragMove}
      onTouchMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchEnd={handleDragEnd}
    >
      {/* Main Content Area */}
      <div className="absolute inset-0 w-full h-full">
        {callInfo.type === 'audio' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#060d14] relative overflow-hidden">
            {/* ✅ FIX: Always render audio remote video element, never conditionally */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="opacity-0 pointer-events-none absolute inset-0 w-1 h-1"
            />

            {/* Animated background rings */}
            <div className="absolute w-[300px] h-[300px] rounded-full border border-[#22d3ee]/10 animate-[ping_4s_infinite]" />
            <div className="absolute w-[500px] h-[500px] rounded-full border border-[#22d3ee]/5 animate-[ping_6s_infinite]" />

            <div className="z-10 flex flex-col items-center">
              <Avatar username={callInfo.name} size="2xl" />
              <h2 className="mt-8 text-3xl font-bold text-white tracking-tight">{callInfo.name}</h2>
              <div className="mt-4 px-4 py-1.5 rounded-full bg-[#0d1825] border border-[#0e2a3d] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse" />
                <p className="text-[#22d3ee] font-mono text-[10px] uppercase tracking-widest font-bold">Ongoing Audio Call</p>
              </div>
            </div>
          </div>
        ) : (
          // ✅ FIX: Always render remote video element, use display:none instead of conditional render
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: remoteStream ? 'block' : 'none' }}
            />
            {!remoteStream && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#060d14]">
                <Avatar username={callInfo.name} size="xl" />
                <p className="mt-4 text-[#22d3ee] animate-pulse">Connecting...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local Video (PIP) - Only for video calls */}
      {callInfo.type === 'video' && (
        <div
          className="absolute z-20 cursor-move transition-transform duration-75 active:scale-105 shadow-2xl shadow-black/50"
          style={{
            bottom: pipPosition.y,
            right: pipPosition.x,
            width: 'min(120px, 30vw)',
            aspectRatio: '3/4'
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-full h-full rounded-2xl border-2 border-[#22d3ee] bg-[#0d1825] overflow-hidden">
            {isCameraOff ? (
              <div className="w-full h-full flex items-center justify-center bg-[#0d1825]">
                <Avatar username="You" size="sm" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            )}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 p-6 flex items-center gap-4 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          } bg-gradient-to-b from-[#060d14]/80 to-transparent pt-[max(24px,env(safe-area-inset-top))]`}
      >
        <button
          onClick={onEnd}
          className="p-2 rounded-full bg-[#0d1825]/60 border border-[#0e2a3d] text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{callInfo.name}</h3>
          <p className="text-[#22d3ee] text-xs font-mono">{formatDuration(callDuration)}</p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-8 flex justify-center items-center gap-6 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          } bg-gradient-to-t from-[#060d14]/90 to-transparent pb-[max(32px,env(safe-area-inset-bottom))]`}
      >
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-[#7f1d1d] text-white' : 'bg-[#0d1825]/80 border border-[#0e2a3d] text-[#e2f0ff]'
            }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {callInfo.type === 'video' && (
          <button
            onClick={onToggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-[#7f1d1d] text-white' : 'bg-[#0d1825]/80 border border-[#0e2a3d] text-[#e2f0ff]'
              }`}
          >
            {isCameraOff ? <VideoOff size={24} /> : <VideoIcon size={24} />}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-[#dc2626] flex items-center justify-center text-white shadow-lg shadow-red-900/40 active:scale-90"
        >
          <PhoneOff size={28} />
        </button>

        <div className="flex gap-4 md:gap-6">
          {callInfo.type === 'video' && (
            <button
              onClick={onFlipCamera}
              className="w-14 h-14 rounded-full bg-[#0d1825]/80 border border-[#0e2a3d] flex items-center justify-center text-[#e2f0ff]"
            >
              <RefreshCw size={24} />
            </button>
          )}

          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isSpeakerOn ? 'bg-[#7f1d1d] text-white' : 'bg-[#0d1825]/80 border border-[#0e2a3d] text-[#e2f0ff]'
              }`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
