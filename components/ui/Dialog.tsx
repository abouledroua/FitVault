import { useEffect, useState } from 'react';

type DialogProps = {
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  onClose: () => void;
};

export default function Dialog({ message, type, onClose }: DialogProps) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - (100 / (3000 / 50)); // 3s total
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, onClose]);

  const colors = {
    success: 'from-emerald-500 to-emerald-700 border-emerald-500',
    warning: 'from-amber-500 to-amber-700 border-amber-500',
    info: 'from-cyan-500 to-cyan-700 border-cyan-500',
    error: 'from-rose-500 to-rose-700 border-rose-500',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div 
        className={`relative overflow-hidden rounded-lg border bg-slate-900/80 backdrop-blur-xl p-4 shadow-2xl min-w-[300px] border-${type === 'success' ? 'emerald' : type === 'warning' ? 'amber' : type === 'info' ? 'cyan' : 'rose'}-500/50`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white"
        >
          &times;
        </button>
        <p className="text-white text-sm font-medium mb-3">{message}</p>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full">
          <div 
            className={`h-full bg-gradient-to-r ${colors[type]}`}
            style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
          />
        </div>
      </div>
    </div>
  );
}
