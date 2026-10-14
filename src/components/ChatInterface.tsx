import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  XCircle,
  Copy,
  Check,
  Volume2,
  Trash2,
  Shield,
  RefreshCw,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, AssistantStatus } from '../types/batman.ts';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  status: AssistantStatus;
  statusMessage?: string;
  onSendMessage: (text: string) => void;
  onCancelRequest: () => void;
  onClearHistory: () => void;
  onSpeakMessage: (text: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  status,
  statusMessage,
  onSendMessage,
  onCancelRequest,
  onClearHistory,
  onSpeakMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status === 'THINKING' || status === 'RETRYING') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isBusy = status === 'THINKING' || status === 'RETRYING';

  const SUGGESTED_PROMPTS = [
    { label: 'Gotham Status', text: 'Batman, report Gotham defense grid and surveillance status.' },
    { label: 'Tamil Greeting', text: 'Vanakkam Batman, eppadi irukinga? System status nalla irukka?' },
    { label: '503 Resiliency Check', text: 'Explain how B.A.T. handles Gemini API 503 Service Unavailable errors and jitter.' },
    { label: 'Python Helper', text: 'Write a Python utility with exponential backoff and safe file handling for Gotham operations.' },
    { label: 'Open Terminal', text: 'Open the Gotham tactical terminal utility for diagnostic review.' },
  ];

  return (
    <div className="flex flex-col h-full bg-neutral-950/70 border border-neutral-800 rounded-lg overflow-hidden flex-1 shadow-xl">
      {/* Tactical Chat Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-hud text-xs tracking-wider font-bold text-amber-400">
            TACTICAL COMMS LOG
          </span>
          <span className="text-[10px] font-mono-code text-neutral-400">
            ({messages.length} ENTRIES)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBusy && (
            <button
              onClick={onCancelRequest}
              className="flex items-center gap-1 px-2 py-1 rounded bg-red-950/70 border border-red-500/60 text-red-300 text-[11px] font-mono-code hover:bg-red-900/80 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Abort Request</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
              title="Clear Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 bg-neutral-900/40 border-b border-neutral-800/60 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        {SUGGESTED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.text)}
            disabled={isBusy}
            className="shrink-0 px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/60 text-[11px] font-mono-code text-neutral-300 hover:text-amber-300 transition-all disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Scrollable Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <Cpu className="w-10 h-10 text-amber-500/40 mb-2" />
            <p className="font-hud text-sm text-neutral-300 mb-1">
              B.A.T. QUANTUM LINK ESTABLISHED
            </p>
            <p className="text-xs font-mono-code max-w-sm text-neutral-400">
              Speak using the microphone or input directives below. Primary node configured for resilient Gemini routing with zero-crash fallbacks.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-[10px] font-mono-code text-neutral-400">
                <span className={msg.role === 'user' ? 'text-amber-400' : 'text-neutral-300'}>
                  {msg.role === 'user' ? 'BATMAN' : 'B.A.T.'}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {/* Telemetry metadata tags for assistant responses */}
                {msg.role === 'assistant' && (
                  <>
                    {msg.provider === 'PRIMARY_GEMINI' && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-950/70 border border-sky-600/50 text-sky-300 text-[9px]">
                        {msg.modelUsed || 'gemini-3.8-flash'}
                      </span>
                    )}

                    {msg.provider === 'FALLBACK_GEMINI' && (
                      <span className="px-1.5 py-0.2 rounded bg-yellow-950/70 border border-yellow-500/60 text-yellow-300 text-[9px] flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-yellow-400" />
                        <span>FALLBACK: {msg.modelUsed || 'gemini-3.1-flash-lite'}</span>
                      </span>
                    )}

                    {msg.provider === 'OFFLINE_BAT_TACTICAL' && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/70 text-amber-300 text-[9px] flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-amber-400" />
                        <span>LOCAL OFFLINE TACTICAL</span>
                      </span>
                    )}

                    {msg.recoveredFrom503 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-[9px] flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Recovered ({msg.retries} retries)</span>
                      </span>
                    )}

                    {msg.latencyMs !== undefined && (
                      <span className="text-neutral-400 text-[9px]">
                        {msg.latencyMs}ms
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-lg px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap break-words border ${
                  msg.role === 'user'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-100 rounded-br-none shadow-[0_0_12px_rgba(234,179,8,0.1)]'
                    : 'bg-neutral-900/90 border-neutral-700/80 text-neutral-200 rounded-bl-none shadow-md'
                }`}
              >
                {msg.content}

                {/* Tool call attachment if any */}
                {msg.toolCall && (
                  <div className="mt-2.5 p-2 rounded bg-black/60 border border-amber-500/30 text-[11px] font-mono-code text-amber-300 flex items-center justify-between">
                    <div>
                      <span className="text-neutral-400">Tactical Tool: </span>
                      <strong>{msg.toolCall.tool}</strong>
                    </div>
                    <span className="text-[10px] text-amber-400/80">Authorized</span>
                  </div>
                )}
              </div>

              {/* Action Buttons underneath assistant message */}
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-1 text-neutral-400 text-[10px]">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => onSpeakMessage(msg.content)}
                    className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Speak</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Status Indicator Bubble */}
        {isBusy && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-neutral-900 border border-amber-500/60 flex items-center justify-center shrink-0">
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            </div>
            <div className="p-3 rounded-lg bg-neutral-900/90 border border-amber-500/40 text-xs font-mono-code text-amber-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{statusMessage || 'Processing tactical neural response...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-neutral-900/90 border-t border-neutral-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command B.A.T. (e.g. 'Status report', 'Open terminal', 'Vanakkam Batman')..."
          disabled={isBusy}
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isBusy}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-black font-hud text-xs font-bold rounded-md transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
        >
          <span>SEND</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
