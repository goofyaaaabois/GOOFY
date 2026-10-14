import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Cpu,
  Clock,
  Battery,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { SystemTelemetry, LanguageMode } from '../types/batman.ts';

interface TelemetryBarProps {
  telemetry: SystemTelemetry;
  languageMode: LanguageMode;
  onLanguageChange: (mode: LanguageMode) => void;
  metrics?: {
    totalRequests: number;
    totalRetries: number;
    successful503Recoveries: number;
    fallbackActivations: number;
  };
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  languageMode,
  onLanguageChange,
  metrics,
}) => {
  const [localClock, setLocalClock] = useState<string>('');
  const [gothamClock, setGothamClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const gotham = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      setGothamClock(gotham.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-neutral-950/90 border-b border-neutral-800/80 px-4 py-2.5 flex items-center justify-between flex-wrap gap-3 backdrop-blur-md sticky top-0 z-40">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Stylized Bat Wings Vector */}
          <svg viewBox="0 0 100 50" className="w-8 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" fill="currentColor">
            <path d="M 50 14 C 47 6, 44 0, 43 0 C 42 6, 38 12, 33 13 C 27 10, 18 10, 0 20 C 10 26, 22 25, 27 34 C 33 43, 44 48, 50 50 C 56 48, 67 43, 73 34 C 78 25, 90 26, 100 20 C 82 10, 73 10, 67 13 C 62 12, 58 6, 57 0 C 56 0, 53 6, 50 14 Z" />
          </svg>
          <div>
            <h1 className="font-hud text-sm font-black tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>B.A.T.</span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-normal">
                v2.6 RESILIENT
              </span>
            </h1>
            <p className="text-[9px] font-mono-code text-neutral-400 tracking-wider">
              BATMAN ASSISTENT TRANSFORMER
            </p>
          </div>
        </div>
      </div>

      {/* Center Tactical Telemetry */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono-code text-neutral-300">
        {/* Clocks */}
        <div className="flex items-center gap-3 bg-neutral-900/80 px-3 py-1 rounded border border-neutral-800">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400 text-[10px]">LOCAL:</span>
            <span className="font-bold text-neutral-200">{localClock}</span>
          </div>
          <span className="text-neutral-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 text-[10px]">GOTHAM (UTC-4):</span>
            <span className="font-bold text-amber-300">{gothamClock}</span>
          </div>
        </div>

        {/* Resilience Counters */}
        {metrics && (
          <div className="flex items-center gap-2 bg-neutral-900/80 px-2.5 py-1 rounded border border-neutral-800 text-[11px]">
            <span className="text-neutral-400">503 Recoveries:</span>
            <span className="text-emerald-400 font-bold">{metrics.successful503Recoveries}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">Retries:</span>
            <span className="text-amber-400 font-bold">{metrics.totalRetries}</span>
          </div>
        )}
      </div>

      {/* Right Action Badges */}
      <div className="flex items-center gap-2">
        {/* Primary Node Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-mono-code">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline text-neutral-400">NODE:</span>
          <span className="text-sky-300 font-semibold">{telemetry.activeModel || 'gemini-3.8-flash'}</span>
        </div>

        {/* Connectivity Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono-code border ${
            telemetry.apiConnected
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
          }`}
        >
          {telemetry.apiConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-bold">{telemetry.apiConnected ? 'OPTIMAL' : 'LOCAL FALLBACK'}</span>
        </div>

        {/* Language selector chip */}
        <button
          onClick={() => {
            const nextLang: LanguageMode = languageMode === 'EN' ? 'TANGLISH' : languageMode === 'TANGLISH' ? 'TAMIL' : 'EN';
            onLanguageChange(nextLang);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono-code text-amber-400 transition-colors"
          title="Switch persona language (English, Tanglish, Tamil)"
        >
          <Globe className="w-3 h-3" />
          <span>{languageMode}</span>
        </button>
      </div>
    </header>
  );
};
