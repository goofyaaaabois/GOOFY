import React from 'react';
import { AssistantStatus } from '../types/batman.ts';
import { Shield, AlertTriangle, RefreshCw, Mic, Volume2, Cpu, Radio } from 'lucide-react';

interface BatmanHUDProps {
  status: AssistantStatus;
  retryInfo?: {
    attempt: number;
    delayMs: number;
    model?: string;
    message?: string;
  };
  audioLevel?: number; // 0 to 100
  isSpeaking?: boolean;
  onMicToggle?: () => void;
  onStopSpeaking?: () => void;
}

export const BatmanHUD: React.FC<BatmanHUDProps> = ({
  status,
  retryInfo,
  audioLevel = 15,
  isSpeaking = false,
  onMicToggle,
  onStopSpeaking,
}) => {
  // Determine state-specific visual characteristics
  const isRetrying = status === 'RETRYING';
  const isFallback = status === 'FALLBACK';
  const isThinking = status === 'THINKING';
  const isListening = status === 'LISTENING';
  const isError = status === 'ERROR';

  const ringColor = isError
    ? '#ef4444'
    : isRetrying
    ? '#f59e0b'
    : isFallback
    ? '#eab308'
    : isThinking
    ? '#38bdf8'
    : '#eab308';

  const glowClass = isError
    ? 'shadow-[0_0_35px_rgba(239,68,68,0.4)]'
    : isRetrying
    ? 'shadow-[0_0_35px_rgba(245,158,11,0.5)]'
    : isThinking
    ? 'shadow-[0_0_35px_rgba(56,189,248,0.4)]'
    : 'shadow-[0_0_30px_rgba(234,179,8,0.35)]';

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Container with glowing radar circle */}
      <div className={`relative w-64 h-64 sm:w-76 sm:h-76 md:w-84 md:h-84 rounded-full flex items-center justify-center bg-black/70 border border-neutral-800/80 transition-all duration-700 ${glowClass}`}>
        
        {/* Subtle Background Scanning Grid */}
        <div className="absolute inset-2 rounded-full bat-grid-bg opacity-30 pointer-events-none" />

        {/* Dynamic Sweeping Radar Beam (visible during THINKING and LISTENING) */}
        {(isThinking || isListening) && (
          <div
            className="absolute inset-4 rounded-full pointer-events-none animate-spin-fast opacity-40"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, ${ringColor} 360deg)`,
            }}
          />
        )}

        {/* Outer Gyro Ring with Degree Ticks */}
        <svg
          viewBox="0 0 400 400"
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            isThinking ? 'animate-spin-fast' : 'animate-spin-slow'
          }`}
        >
          {/* Outer circle */}
          <circle
            cx="200"
            cy="200"
            r="192"
            fill="none"
            stroke={ringColor}
            strokeWidth="1.5"
            strokeDasharray="4 8"
            strokeOpacity="0.4"
          />

          {/* Concentric Segmented Ring */}
          <circle
            cx="200"
            cy="200"
            r="175"
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeDasharray="90 30 40 30 90 30"
            strokeOpacity={isRetrying ? '0.9' : '0.6'}
          />

          {/* Tactical Crosshair Marks at 0, 90, 180, 270 degrees */}
          <line x1="200" y1="4" x2="200" y2="24" stroke={ringColor} strokeWidth="3" />
          <line x1="200" y1="376" x2="200" y2="396" stroke={ringColor} strokeWidth="3" />
          <line x1="4" y1="200" x2="24" y2="200" stroke={ringColor} strokeWidth="3" />
          <line x1="376" y1="200" x2="396" y2="200" stroke={ringColor} strokeWidth="3" />
        </svg>

        {/* Middle Counter-Rotating Technical Ring */}
        <svg
          viewBox="0 0 400 400"
          className={`absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none ${
            isThinking ? 'animate-spin-fast' : 'animate-spin-reverse-slow'
          }`}
        >
          <circle
            cx="200"
            cy="200"
            r="145"
            fill="none"
            stroke={ringColor}
            strokeWidth="2"
            strokeDasharray="15 25"
            strokeOpacity="0.5"
          />
          <circle
            cx="200"
            cy="200"
            r="130"
            fill="none"
            stroke={ringColor}
            strokeWidth="1"
            strokeDasharray="6 6"
            strokeOpacity="0.3"
          />
        </svg>

        {/* Inner Pulsing Radar Circle */}
        <div
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-yellow-500/30 transition-transform duration-300 ${
            isListening ? 'scale-110 border-yellow-400 animate-pulse' : 'scale-100'
          }`}
          style={{
            transform: isListening ? `scale(${1 + audioLevel / 250})` : undefined,
          }}
        />

        {/* Center Interactive Core / Emblem */}
        <div
          onClick={isSpeaking ? onStopSpeaking : onMicToggle}
          title={isSpeaking ? "Click to interrupt speech" : "Click to toggle voice input"}
          className={`relative z-10 w-28 h-28 sm:w-34 sm:h-34 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none group ${
            isRetrying
              ? 'bg-amber-950/40 border-2 border-amber-500 hover:bg-amber-900/50'
              : isThinking
              ? 'bg-sky-950/40 border-2 border-sky-400 hover:bg-sky-900/50'
              : isError
              ? 'bg-red-950/40 border-2 border-red-500 hover:bg-red-900/50'
              : 'bg-black/90 border-2 border-yellow-500/80 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.5)]'
          }`}
        >
          {/* Batman Mask / Emblem Silhouette Vector */}
          <svg
            viewBox="0 0 100 50"
            className={`w-14 h-7 transition-all duration-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] ${
              isThinking ? 'text-sky-400 animate-pulse' : isError ? 'text-red-400' : 'text-amber-400'
            }`}
            fill="currentColor"
          >
            {/* Precision Geometric Bat Silhouette */}
            <path d="M 50 14 C 47 6, 44 0, 43 0 C 42 6, 38 12, 33 13 C 27 10, 18 10, 0 20 C 10 26, 22 25, 27 34 C 33 43, 44 48, 50 50 C 56 48, 67 43, 73 34 C 78 25, 90 26, 100 20 C 82 10, 73 10, 67 13 C 62 12, 58 6, 57 0 C 56 0, 53 6, 50 14 Z" />
          </svg>

          {/* Central Status Icon */}
          <div className="mt-1 flex items-center gap-1">
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            ) : isFallback ? (
              <Shield className="w-4 h-4 text-yellow-400" />
            ) : isThinking ? (
              <Cpu className="w-4 h-4 text-sky-400 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-4 h-4 text-yellow-400 animate-bounce" />
            ) : isSpeaking ? (
              <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
            ) : isError ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <Radio className="w-4 h-4 text-neutral-400 group-hover:text-amber-400 transition-colors" />
            )}
            <span className="font-hud text-[11px] font-bold tracking-wider text-amber-400">
              B.A.T.
            </span>
          </div>

          {/* State Sub-text */}
          <span className="text-[9px] font-mono-code font-semibold uppercase tracking-widest text-neutral-400 mt-0.5">
            {status}
          </span>
        </div>

        {/* Audio Waveform Equalizer Ticks (Active when speaking or listening) */}
        {(isSpeaking || isListening) && (
          <div className="absolute -bottom-6 flex items-center gap-1.5 px-3 py-1 bg-black/80 rounded-full border border-amber-500/40">
            {[4, 12, 20, 16, 28, 22, 14, 8, 18, 26, 10].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-amber-400 rounded-full transition-all duration-150"
                style={{
                  height: `${Math.max(4, (h * (audioLevel || 25)) / 30)}px`,
                  opacity: 0.6 + (i % 3) * 0.15,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Real-time Status & Retry Alert Pill */}
      <div className="mt-5 flex flex-col items-center text-center max-w-sm">
        {isRetrying && retryInfo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-950/70 border border-amber-500/60 text-amber-300 text-xs font-mono-code animate-pulse shadow-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>
              <strong>503 High Demand:</strong> Backoff {(retryInfo.delayMs / 1000).toFixed(1)}s (Attempt {retryInfo.attempt}/3)
            </span>
          </div>
        )}

        {isFallback && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-yellow-950/60 border border-yellow-500/50 text-yellow-300 text-xs font-mono-code">
            <Shield className="w-3.5 h-3.5 text-yellow-400" />
            <span>Fallback Node Engaged • Zero Downtime</span>
          </div>
        )}

        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
          >
            <Volume2 className="w-3 h-3 text-amber-400" />
            <span>Speaking... [Click to Interrupt]</span>
          </button>
        )}
      </div>
    </div>
  );
};
