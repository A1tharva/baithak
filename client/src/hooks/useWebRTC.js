import { useRef, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:baithak.metered.live:80',
      username: 'f8c8002530dcdee4d5f541d4',
      credential: 'Z4moMAWj+4sSFqA3',
    },
    {
      urls: 'turn:baithak.metered.live:443',
      username: 'f8c8002530dcdee4d5f541d4',
      credential: 'Z4moMAWj+4sSFqA3',
    },
    {
      urls: 'turns:baithak.metered.live:443',
      username: 'f8c8002530dcdee4d5f541d4',
      credential: 'Z4moMAWj+4sSFqA3',
    },
  ],
};

export const useWebRTC = () => {
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();
  const [callState, setCallState] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callInfo, setCallInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const timerStartedRef = useRef(false);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    iceCandidateQueue.current = [];
    timerStartedRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCallInfo(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setError(null);
  }, []);

  const startTimer = useCallback(() => {
    if (timerStartedRef.current) return;
    timerStartedRef.current = true;
    setCallDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getMedia = async (type = 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied. Please allow access and try again.'
        : err.name === 'NotFoundError'
          ? 'No camera or microphone found on this device.'
          : 'Could not access camera/microphone.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const createPeerConnection = useCallback((targetUserId) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('call:ice-candidate', { to: targetUserId, candidate });
    };

    peer.ontrack = ({ streams }) => {
      console.log('🎥 ontrack fired, streams:', streams);
      if (streams && streams[0]) setRemoteStream(streams[0]);
    };

    peer.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peer.connectionState);
      if (peer.connectionState === 'connected') { setCallState('connected'); startTimer(); }
      if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) cleanup();
    };

    peer.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', peer.iceConnectionState);
      if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        setCallState('connected');
        startTimer();
      }
      if (peer.iceConnectionState === 'failed') peer.restartIce();
    };

    peerRef.current = peer;
    return peer;
  }, [socket, startTimer, cleanup]);

  const startCall = useCallback(async (targetUser, type = 'video') => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) { setError('Video calling requires HTTPS.'); return; }
    try {
      setCallState('calling');
      setCallInfo({ userId: targetUser._id, name: targetUser.username, avatar: targetUser.avatar, type, conversationId: targetUser.conversationId });
      setError(null);
      const stream = await getMedia(type);
      const peer = createPeerConnection(targetUser._id);
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
      await peer.setLocalDescription(offer);
      socket.emit('call:offer', { to: targetUser._id, from: currentUser._id, offer, callerName: currentUser.username, callerAvatar: currentUser.avatar, callType: type, conversationId: targetUser.conversationId });
    } catch (err) { setCallState('idle'); console.error('Start call error:', err); }
  }, [socket, currentUser, createPeerConnection]);

  const acceptCall = useCallback(async (incomingData) => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) { setError('Video calling requires HTTPS.'); return; }
    try {
      setCallState('connecting');
      setError(null);
      const stream = await getMedia(incomingData.type || 'video');
      const peer = createPeerConnection(incomingData.from);
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      for (const candidate of iceCandidateQueue.current) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidateQueue.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('call:answer', { to: incomingData.from, answer });
    } catch (err) { setCallState('idle'); console.error('Accept call error:', err); }
  }, [socket, createPeerConnection]);

  const rejectCall = useCallback((from) => {
    socket.emit('call:reject', { to: from });
    cleanup();
  }, [socket, cleanup]);

  const endCall = useCallback((targetId) => {
    if (targetId && socket) {
      socket.emit('call:end', { to: targetId, conversationId: callInfo?.conversationId, callerId: currentUser?._id, callType: callInfo?.type, duration: callDuration, status: 'completed' });
    }
    cleanup();
  }, [socket, cleanup, callInfo, currentUser, callDuration]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current || localStream;
    if (stream) { stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; }); setIsMuted(prev => !prev); }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current || localStream;
    if (stream) { stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; }); setIsCameraOff(prev => !prev); }
  }, [localStream]);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newVideoTrack);
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      localStreamRef.current.removeTrack(videoTrack);
      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) { console.error('Flip camera error:', err); }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onIncoming = (data) => {
      if (callState !== 'idle') { socket.emit('call:busy', { to: data.from }); return; }
      setCallState('incoming');
      setCallInfo({ userId: data.from, name: data.callerName, avatar: data.callerAvatar, type: data.callType || 'video', offer: data.offer, from: data.from, conversationId: data.conversationId });
    };
    const onAnswered = async ({ answer }) => {
      if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const onIceCandidate = async ({ candidate }) => {
      if (peerRef.current?.remoteDescription) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidateQueue.current.push(candidate);
      }
    };
    const onRejected = () => { setError('Call was declined.'); setTimeout(cleanup, 2000); };
    const onEnded = () => { cleanup(); };
    const onBusy = () => { setError('User is busy on another call.'); setTimeout(cleanup, 2000); };
    const onActionBlocked = ({ type, message }) => {
      toast.error(message);
      if (type === 'call' || type === 'audio_call') cleanup();
    };
    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:busy', onBusy);
    socket.on('action_blocked', onActionBlocked);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:busy', onBusy);
      socket.off('action_blocked', onActionBlocked);
    };
  }, [socket, callState, cleanup]);

  return {
    callState, localStream, remoteStream,
    callInfo, isMuted, isCameraOff,
    callDuration, formatDuration, error,
    startCall, acceptCall, rejectCall,
    endCall, toggleMute, toggleCamera, flipCamera,
  };
};
