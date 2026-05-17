import { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import Avatar from './Avatar';

const IncomingCall = ({ callInfo, onAccept, onReject }) => {
  const ringtoneRef = useRef(null);

  useEffect(() => {
    const playRingtone = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playBeep = () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      };

      playBeep();
      return setInterval(playBeep, 2000);
    };

    ringtoneRef.current = playRingtone();

    return () => {
      if (ringtoneRef.current) clearInterval(ringtoneRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060d14]/95 backdrop-blur-md animate-in fade-in duration-300">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes pulse-button {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 83, 45, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(20, 83, 45, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 83, 45, 0); }
        }
        .pulse-ring-1 { animation: pulse-ring 2s infinite; }
        .pulse-ring-2 { animation: pulse-ring 2s infinite 0.5s; }
        .accept-pulse { animation: pulse-button 2s infinite; }
      `}</style>

      <div className="bg-[#080f18] border border-[#0e2a3d] rounded-[32px] p-10 w-full max-w-[320px] text-center shadow-2xl">
        <div className="relative flex justify-center mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-[#22d3ee] pulse-ring-1"></div>
          <div className="absolute inset-0 rounded-full border-2 border-[#22d3ee] pulse-ring-2"></div>
          <div className="z-10 bg-[#080f18] rounded-full p-1">
            <Avatar username={callInfo.name} size="xl" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#e2f0ff] mb-1">{callInfo.name}</h2>
        <p className="text-[#475569] text-sm mb-10">
          Incoming {callInfo.type} call...
        </p>

        <div className="flex justify-center gap-8">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-[#7f1d1d] flex items-center justify-center text-white hover:bg-red-700 transition-all active:scale-90"
          >
            <PhoneOff size={28} />
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-[#14532d] flex items-center justify-center text-white hover:bg-green-700 transition-all active:scale-90 accept-pulse"
          >
            <Phone size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;
