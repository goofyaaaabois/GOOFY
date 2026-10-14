/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AssistantStatus,
  ChatMessage,
  LanguageMode,
  SystemTelemetry,
} from './types/batman.ts';
import { BatmanHUD } from './components/BatmanHUD.tsx';
import { AudioWaveform } from './components/AudioWaveform.tsx';
import { VoiceController } from './components/VoiceController.tsx';
import { ChatInterface } from './components/ChatInterface.tsx';
import { ToolsPanel } from './components/ToolsPanel.tsx';
import { MemoryVault } from './components/MemoryVault.tsx';
import { ResilienceDiagnostics } from './components/ResilienceDiagnostics.tsx';
import { TelemetryBar } from './components/TelemetryBar.tsx';
import {
  Shield,
  Terminal,
  Database,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AssistantStatus>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('B.A.T. Core Standby');
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    delayMs: number;
    model?: string;
    message?: string;
  } | undefined>();

  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'TOOLS' | 'VAULT' | 'DIAGNOSTICS'>('CONSOLE');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('EN');
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(15);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'init-1',
        role: 'assistant',
        content:
          'B.A.T. (Batman Assistent Transformer) online. Quantum uplink connected with primary neural cluster (gemini-3.8-flash).\n\nResilient error handling armed for HTTP 503 high-demand events with exponential jitter backoff, secondary fallback routing, and offline tactical failover. How may I assist you tonight, Batman?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'PRIMARY_GEMINI',
        modelUsed: 'gemini-3.8-flash',
      },
    ];
  });

  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    os: 'Linux / Batcave Subsystem',
    hostname: 'batcomputer-main',
    uptimeHours: '12.4',
    cpuCount: 8,
    memoryUsagePercent: 32,
    localTime: new Date().toLocaleTimeString(),
    gothamTime: new Date().toLocaleTimeString(),
    defenseGridStatus: 'OPTIMAL',
    neuralEncryption: 'AES-256-GCM / Quantum-Safe',
    apiConnected: true,
    activeProvider: 'PRIMARY_GEMINI',
    activeModel: 'gemini-3.8-flash',
    pingMs: 42,
  });

  const [metrics, setMetrics] = useState<{
    totalRequests: number;
    totalRetries: number;
    successful503Recoveries: number;
    fallbackActivations: number;
  }>({
    totalRequests: 1,
    totalRetries: 0,
    successful503Recoveries: 0,
    fallbackActivations: 0,
  });

  const activeAbortRef = useRef<AbortController | null>(null);
  const audioIntervalRef = useRef<number | null>(null);

  // Poll system health
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/system/health');
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setMetrics({
            totalRequests: data.metrics.totalRequests,
            totalRetries: data.metrics.totalRetries,
            successful503Recoveries: data.metrics.successful503Recoveries,
            fallbackActivations: data.metrics.fallbackActivations,
          });
          setTelemetry((prev) => ({
            ...prev,
            activeModel: data.metrics.primaryModel,
            apiConnected: data.metrics.hasApiKey,
          }));
        }
      }
    } catch {
      // Offline fallback handling
      setTelemetry((prev) => ({ ...prev, apiConnected: false }));
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Voice synthesis audio level simulator
  const startAudioAnimation = (mode: 'SPEAKING' | 'LISTENING') => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioIntervalRef.current = window.setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * (mode === 'SPEAKING' ? 35 : 20)) + 15);
    }, 120);
  };

  const stopAudioAnimation = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setAudioLevel(10);
  };

  // Text-To-Speech Execution
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown tags, emojis, and status brackets for natural speech
    const cleanSpeech = text
      .replace(/\[.*?\]/g, '')
      .replace(/[*#`_]/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const englishMale = voices.find(
      (v) =>
        v.lang.includes('en') &&
        (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Natural'))
    );
    if (englishMale) utterance.voice = englishMale;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('SPEAKING');
      startAudioAnimation('SPEAKING');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('IDLE');
      stopAudioAnimation();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('IDLE');
      stopAudioAnimation();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setStatus('IDLE');
    stopAudioAnimation();
  };

  // Main Resilient Message Dispatcher
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    // Interrupt any ongoing speech
    handleStopSpeaking();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setStatus('THINKING');
    setStatusMessage('Querying primary neural cluster (gemini-3.8-flash)...');
    setRetryInfo(undefined);

    // AbortController setup
    const controller = new AbortController();
    activeAbortRef.current = controller;

    try {
      // Craft language instruction
      let languagePrompt = '';
      if (languageMode === 'TAMIL') {
        languagePrompt = 'Respond primarily in fluent Tamil with tactical Batman persona.';
      } else if (languageMode === 'TANGLISH') {
        languagePrompt = 'Respond in natural Tanglish (Tamil-English code-switching) as spoken by Batman assistant.';
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
          systemInstruction: languagePrompt ? undefined : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: result.text || 'Directive acknowledged, Batman.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: result.provider,
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        retries: result.retries,
        recoveredFrom503: result.recoveredFrom503,
        retryLog: result.retryLog,
        toolCall: result.toolCall,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStatus('IDLE');
      setStatusMessage('All systems nominal.');

      // Update telemetry
      fetchHealth();

      // Read aloud assistant reply
      speakText(assistantMsg.content);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        setStatus('IDLE');
        setStatusMessage('Request aborted by Batman.');
        return;
      }

      console.error('[B.A.T. Request Error]', err);
      setStatus('ERROR');
      setStatusMessage(`Error: ${(err as Error)?.message || 'Neural cluster failed'}`);

      // Add failure notification to messages
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `[COMMUNICATION DISRUPTION]\nUnable to reach neural node: ${(err as Error)?.message}. The local BAT-PROTO-7 offline core remains available.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'OFFLINE_BAT_TACTICAL',
        },
      ]);
    } finally {
      activeAbortRef.current = null;
    }
  };

  const handleCancelRequest = () => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
      setStatus('IDLE');
      setStatusMessage('Operation canceled.');
    }
  };

  // Safe Tool Execution
  const handleExecuteTool = async (toolName: string, params: Record<string, unknown>, confirmed = false) => {
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName,
          parameters: params,
          userConfirmed: confirmed,
        }),
      });

      const data = await res.json();
      return data;
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message };
    }
  };

  // Diagnostic Test Suite Executor
  const handleRunDiagnosticTest = async (testType: string) => {
    const start = Date.now();
    try {
      const res = await fetch('/api/diagnostics/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType }),
      });

      const data = await res.json();
      const durationMs = Date.now() - start;

      if (!res.ok || !data.success) {
        return {
          success: false,
          durationMs,
          log: [
            `Test initiated: ${testType}`,
            `HTTP Status: ${res.status}`,
            `Error: ${data.error || 'Test failed'}`,
          ],
        };
      }

      const r = data.result;
      const logs = [
        `[INITIATED] Test sequence: ${testType}`,
        `Model selected: ${r.modelUsed} | Provider: ${r.provider}`,
        `Total Attempts: ${r.attempts} | Retries: ${r.retries}`,
        `503 Recovery Verified: ${r.recoveredFrom503 ? 'YES (Backoff succeeded)' : 'N/A'}`,
      ];

      if (r.retryLog && r.retryLog.length > 0) {
        r.retryLog.forEach((logItem: { attempt: number; error: string; delayMs: number }) => {
          logs.push(
            `Attempt ${logItem.attempt} failed with: ${logItem.error.slice(0, 48)}... Backoff delay: ${(logItem.delayMs / 1000).toFixed(1)}s`
          );
        });
      }

      logs.push(`[PASSED] Result latency: ${durationMs}ms`);
      fetchHealth();

      return {
        success: true,
        durationMs,
        log: logs,
        result: data.result,
      };
    } catch (err: unknown) {
      return {
        success: false,
        durationMs: Date.now() - start,
        log: [`Fatal error during test: ${(err as Error)?.message}`],
      };
    }
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Telemetry Navigation Bar */}
      <TelemetryBar
        telemetry={telemetry}
        languageMode={languageMode}
        onLanguageChange={setLanguageMode}
        metrics={metrics}
      />

      {/* Main Tactical Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setActiveTab('CONSOLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wider transition-all ${
                activeTab === 'CONSOLE'
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>HUD & COMMS</span>
            </button>

            <button
              onClick={() => setActiveTab('TOOLS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wider transition-all ${
                activeTab === 'TOOLS'
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>COMPUTER TOOLS</span>
            </button>

            <button
              onClick={() => setActiveTab('VAULT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wider transition-all ${
                activeTab === 'VAULT'
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>MEMORY VAULT</span>
            </button>

            <button
              onClick={() => setActiveTab('DIAGNOSTICS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wider transition-all ${
                activeTab === 'DIAGNOSTICS'
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>503 DIAGNOSTICS</span>
            </button>
          </div>

          <div className="text-[11px] font-mono-code text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RESILIENCE PROTOCOL: ARMED</span>
          </div>
        </div>

        {/* Tab 1: Central HUD + Comms Terminal */}
        {activeTab === 'CONSOLE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Left Column: Holographic Batman HUD & Audio Waveform */}
            <div className="lg:col-span-5 flex flex-col items-center justify-between gap-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 sm:p-6 shadow-xl">
              <div className="w-full flex items-center justify-between text-[11px] font-mono-code text-neutral-400 border-b border-neutral-800/80 pb-2">
                <span className="flex items-center gap-1 text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>TACTICAL HUD MATRIX</span>
                </span>
                <span>STATUS: {status}</span>
              </div>

              {/* Animated HUD Graphic */}
              <div className="my-auto py-2">
                <BatmanHUD
                  status={status}
                  retryInfo={retryInfo}
                  audioLevel={audioLevel}
                  isSpeaking={isSpeaking}
                  onMicToggle={() => setIsListening(!isListening)}
                  onStopSpeaking={handleStopSpeaking}
                />
              </div>

              {/* Live Audio Spectrum Equalizer */}
              <AudioWaveform
                isActive={isListening || isSpeaking}
                mode={isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : 'IDLE'}
                audioLevel={audioLevel}
              />

              {/* Voice Controller Panel */}
              <div className="w-full mt-2">
                <VoiceController
                  isListening={isListening}
                  onListeningChange={(listening) => {
                    setIsListening(listening);
                    if (listening) {
                      setStatus('LISTENING');
                      startAudioAnimation('LISTENING');
                    } else {
                      if (status === 'LISTENING') setStatus('IDLE');
                      stopAudioAnimation();
                    }
                  }}
                  onTranscript={handleSendMessage}
                  isSpeaking={isSpeaking}
                  onStopSpeaking={handleStopSpeaking}
                  languageMode={languageMode}
                  onLanguageChange={setLanguageMode}
                  wakeWordEnabled={wakeWordEnabled}
                  onWakeWordToggle={setWakeWordEnabled}
                />
              </div>
            </div>

            {/* Right Column: Tactical Comms Log */}
            <div className="lg:col-span-7 flex flex-col h-[650px] lg:h-auto">
              <ChatInterface
                messages={messages}
                status={status}
                statusMessage={statusMessage}
                onSendMessage={handleSendMessage}
                onCancelRequest={handleCancelRequest}
                onClearHistory={() => setMessages([])}
                onSpeakMessage={speakText}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Computer Control & Tools */}
        {activeTab === 'TOOLS' && (
          <div className="flex-1">
            <ToolsPanel onExecuteTool={handleExecuteTool} />
          </div>
        )}

        {/* Tab 3: Persistent Memory Vault */}
        {activeTab === 'VAULT' && (
          <div className="flex-1">
            <MemoryVault />
          </div>
        )}

        {/* Tab 4: 503 Resilience Diagnostics */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="flex-1">
            <ResilienceDiagnostics onRunTest={handleRunDiagnosticTest} />
          </div>
        )}
      </main>

      {/* Footer Tactical Telemetry */}
      <footer className="w-full bg-neutral-950/90 border-t border-neutral-800/80 px-4 py-2 text-[10px] font-mono-code text-neutral-400 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span>HOST: Batcave Core Node 1</span>
          <span>•</span>
          <span>PRIMARY: {telemetry.activeModel}</span>
          <span>•</span>
          <span>FALLBACK: gemini-3.1-flash-lite / BAT-PROTO-7</span>
        </div>
        <div className="flex items-center gap-3 text-neutral-400">
          <span>ENCRYPTION: 256-BIT QUANTUM</span>
          <span>•</span>
          <span className="text-amber-400">B.A.T. ONLINE</span>
        </div>
      </footer>
    </div>
  );
}
