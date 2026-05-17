import { useEffect, useState } from 'react';
import { PhoneOff } from 'lucide-react';
import Avatar from './Avatar';

const OutgoingCall = ({ callInfo, onEnd }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const timeout = setTimeout(() => {
      onEnd();
    }, 30000); // Auto-cancel after 30s

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onEnd]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060d14]/95 backdrop-blur-md animate-in fade-in duration-300">
      <style>{`
        @keyframes pulse-avatar {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(34, 211, 238, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
        }
        .pulse-avatar { animation: pulse-avatar 2s infinite; }
      `}</style>

      <div className="bg-[#080f18] border border-[#0e2a3d] rounded-[32px] p-10 w-full max-w-[320px] text-center shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="rounded-full pulse-avatar">
            <Avatar username={callInfo.name} size="xl" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#e2f0ff] mb-1">
          Calling {callInfo.name}{dots}
        </h2>
        <p className="text-[#475569] text-sm mb-10">
          Waiting for answer...
        </p>

        <div className="flex justify-center">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-[#7f1d1d] flex items-center justify-center text-white hover:bg-red-700 transition-all active:scale-90"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutgoingCall;
