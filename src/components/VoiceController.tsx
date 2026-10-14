import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Settings2, Play } from 'lucide-react';
import { LanguageMode } from '../types/batman.ts';

interface VoiceControllerProps {
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
  onTranscript: (transcript: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  languageMode: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
  wakeWordEnabled: boolean;
  onWakeWordToggle: (enabled: boolean) => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  isListening,
  onListeningChange,
  onTranscript,
  isSpeaking,
  onStopSpeaking,
  languageMode,
  onLanguageChange,
  wakeWordEnabled,
  onWakeWordToggle,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(0.95);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Ref to hold recognition instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Default to a deep, sophisticated English voice if found
        const preferred = available.findIndex(
          (v) =>
            v.lang.includes('en') &&
            (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Natural'))
        );
        if (preferred !== -1) setSelectedVoiceIndex(preferred);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setStatusMessage('Web Speech API not supported in this browser. You can type commands below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    // Set language
    recognition.lang = languageMode === 'TAMIL' ? 'ta-IN' : 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.trim();

      if (!transcript) return;

      // Check for wake word if enabled
      if (wakeWordEnabled) {
        const lower = transcript.toLowerCase();
        if (lower.includes('hey bat') || lower.includes('hey batman') || lower.includes('batman') || lower.includes('bat')) {
          // Strip wake word and trigger
          const clean = transcript
            .replace(/hey\s+batman/i, '')
            .replace(/hey\s+bat/i, '')
            .replace(/^batman/i, '')
            .trim();
          onTranscript(clean || 'Batman listening');
        }
      } else {
        onTranscript(transcript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn('[Speech Recognition Error]', event.error);
      if (event.error === 'not-allowed') {
        setStatusMessage('Microphone access denied. Grant browser mic permission to use voice commands.');
      }
      onListeningChange(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if listening was toggled on continuously
        try {
          recognition.start();
        } catch {
          // ignore already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [languageMode, wakeWordEnabled, isListening, onListeningChange, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      onListeningChange(false);
      setStatusMessage('Voice recognition standby.');
    } else {
      try {
        recognitionRef.current.start();
        onListeningChange(true);
        setStatusMessage(wakeWordEnabled ? 'Listening for wake word ("Hey BAT" or "Batman")...' : 'Listening for spoken command...');
      } catch (err) {
        console.warn('Failed to start recognition', err);
      }
    }
  };

  // Test current TTS voice
  const testSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const sample = languageMode === 'TAMIL'
      ? 'Vanakkam Batman. B.A.T. voice synthesis operational.'
      : 'All systems online, Batman. Voice synthesis is fully calibrated.';

    const utterance = new SpeechSynthesisUtterance(sample);
    if (voices[selectedVoiceIndex]) utterance.voice = voices[selectedVoiceIndex];
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-lg p-3">
      {/* Voice Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Main Mic Toggle Button */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-hud text-xs tracking-wider font-semibold transition-all shadow-md ${
              isListening
                ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse'
                : 'bg-neutral-900 text-neutral-300 border border-neutral-700 hover:border-yellow-500/60 hover:text-yellow-400'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-neutral-500" />}
            <span>{isListening ? 'VOICE: ACTIVE' : 'PUSH TO TALK'}</span>
          </button>

          {/* Wake Word Indicator */}
          <button
            onClick={() => onWakeWordToggle(!wakeWordEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono-code transition-colors border ${
              wakeWordEnabled
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Enable continuous listening for 'Hey BAT' or 'Batman'"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Wake Word: {wakeWordEnabled ? 'ON ("Hey BAT")' : 'OFF'}</span>
          </button>

          {/* Stop Speaking / Interrupt */}
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono-code bg-red-950/60 border border-red-500/60 text-red-300 hover:bg-red-900/60 animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Interrupt Speech</span>
            </button>
          )}
        </div>

        {/* Language & Settings toggles */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800 text-[11px] font-mono-code">
            {(['EN', 'TANGLISH', 'TAMIL'] as LanguageMode[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  languageMode === lang
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded border transition-colors ${
              showSettings
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Voice & Speech Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Status Alert if any */}
      {statusMessage && (
        <div className="mt-2 text-[11px] font-mono-code text-neutral-400 px-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Collapsible Voice Settings Panel */}
      {showSettings && (
        <div className="mt-3 pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
          {/* Voice selector */}
          <div>
            <label className="text-neutral-400 block mb-1">Synthesizer Voice</label>
            <select
              value={selectedVoiceIndex}
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-200 text-xs focus:border-amber-500 outline-none"
            >
              {voices.map((v, idx) => (
                <option key={idx} value={idx}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate & Pitch */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-neutral-400 block mb-1">Rate: {speechRate}x</label>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-neutral-400 block mb-1">Pitch: {speechPitch}</label>
              <input
                type="range"
                min="0.6"
                max="1.3"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Test Button */}
          <div className="flex items-end">
            <button
              onClick={testSpeech}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-neutral-900 border border-neutral-700 hover:border-amber-500 text-neutral-300 hover:text-amber-400 rounded transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Voice Persona</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
