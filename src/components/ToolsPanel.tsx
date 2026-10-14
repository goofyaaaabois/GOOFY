import React, { useState } from 'react';
import {
  Terminal,
  ExternalLink,
  ShieldAlert,
  Clock,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

interface ToolsPanelProps {
  onExecuteTool: (toolName: string, params: Record<string, unknown>, userConfirmed?: boolean) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    requiresConfirmation?: boolean;
    message?: string;
    targetUrl?: string;
  }>;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ onExecuteTool }) => {
  const [activeOutput, setActiveOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    toolName: string;
    params: Record<string, unknown>;
    label: string;
    warning: string;
  } | null>(null);

  const handleToolClick = async (
    toolName: string,
    params: Record<string, unknown> = {},
    requiresExplicitConfirm = false,
    label = 'Action',
    warning = 'This will execute a computer control routine with your permission.'
  ) => {
    if (requiresExplicitConfirm) {
      setPendingConfirmation({ toolName, params, label, warning });
      return;
    }

    setLoading(true);
    setActiveOutput('Executing security-checked routine...');
    const result = await onExecuteTool(toolName, params, true);
    setLoading(false);

    if (result.success) {
      if (result.targetUrl) {
        window.open(result.targetUrl, '_blank', 'noopener,noreferrer');
      }
      setActiveOutput(JSON.stringify(result.data || result.message || 'Operation successful', null, 2));
    } else {
      setActiveOutput(`[ERROR] ${result.error || 'Execution blocked'}`);
    }
  };

  const confirmPendingExecution = async () => {
    if (!pendingConfirmation) return;
    const { toolName, params } = pendingConfirmation;
    setPendingConfirmation(null);
    setLoading(true);
    setActiveOutput('Authorized by Batman. Commencing execution...');
    const result = await onExecuteTool(toolName, params, true);
    setLoading(false);

    if (result.success) {
      if (result.targetUrl) {
        window.open(result.targetUrl, '_blank', 'noopener,noreferrer');
      }
      setActiveOutput(JSON.stringify(result.data || result.message || 'Authorized operation completed', null, 2));
    } else {
      setActiveOutput(`[EXECUTION FAILED] ${result.error}`);
    }
  };

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h3 className="font-hud text-xs tracking-wider font-bold text-amber-400 uppercase">
            Computer Control & Tactical Tools
          </h3>
        </div>
        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300">
          ALLOWLIST ACTIVE
        </span>
      </div>

      {/* Grid of Safe Computer Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* Tool 1: System Telemetry */}
        <button
          onClick={() => handleToolClick('get_system_telemetry', {}, false)}
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              System Telemetry
            </span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Read Batcave host metrics, CPU cores, memory loads, and Gotham time.
          </p>
        </button>

        {/* Tool 2: Perimeter Network Scan */}
        <button
          onClick={() =>
            handleToolClick(
              'run_network_scan',
              {},
              true,
              'Perimeter Network Security Scan',
              'Performs a diagnostic probe across local relays and Gotham communication hubs.'
            )
          }
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              Perimeter Scan
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Probe network encryption, open surveillance relays, and ping Gotham hub.
          </p>
        </button>

        {/* Tool 3: Sandboxed Files */}
        <button
          onClick={() => handleToolClick('query_local_files', {}, false)}
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              Sandboxed Vault
            </span>
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Read authorized files in Batcave vehicles and Gotham surveillance directories.
          </p>
        </button>

        {/* Tool 4: Open GitHub */}
        <button
          onClick={() =>
            handleToolClick(
              'open_approved_destination',
              { destination: 'github' },
              true,
              'Launch GitHub Repository Browser',
              'Opens external development portal for review.'
            )
          }
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              Launch GitHub
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Approved portal: Opens project code repository in a secure tab.
          </p>
        </button>

        {/* Tool 5: Tactical Countdown */}
        <button
          onClick={() =>
            handleToolClick('set_tactical_timer', { seconds: 120, label: 'Gotham Night Patrol' }, false)
          }
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              Patrol Timer (2m)
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Arm a 120-second tactical notification alarm on the Batcomputer console.
          </p>
        </button>

        {/* Tool 6: Weather & Atmospheric */}
        <button
          onClick={() =>
            handleToolClick(
              'open_approved_destination',
              { destination: 'weather' },
              true,
              'Check Gotham Atmospheric Weather',
              'Accesses meteorological radar feeds for mission planning.'
            )
          }
          disabled={loading}
          className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-semibold text-neutral-200 group-hover:text-amber-400">
              Gotham Weather
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] font-mono-code text-neutral-400">
            Inspect radar weather conditions for flight and surveillance operations.
          </p>
        </button>
      </div>

      {/* Output Console */}
      {activeOutput && (
        <div className="mt-2 p-3 rounded-lg bg-black/90 border border-neutral-800 font-mono-code text-xs text-amber-300">
          <div className="flex items-center justify-between mb-1 text-[10px] text-neutral-400 border-b border-neutral-800 pb-1">
            <span>TOOL OUTPUT STREAM</span>
            <button
              onClick={() => setActiveOutput(null)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Clear
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap">{activeOutput}</pre>
        </div>
      )}

      {/* Consequential Action Confirmation Modal */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border-2 border-amber-500 rounded-xl p-5 shadow-2xl bat-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-amber-950 border border-amber-500/60">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-hud text-sm font-bold text-amber-400">
                  CONFIRMATION REQUIRED
                </h4>
                <p className="text-xs text-neutral-400 font-mono-code">
                  Batcomputer Security Directive 7
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-neutral-900 border border-neutral-800 mb-4 text-xs font-mono-code text-neutral-300">
              <p className="font-semibold text-amber-300 mb-1">
                {pendingConfirmation.label}
              </p>
              <p className="text-neutral-400 mb-2">{pendingConfirmation.warning}</p>
              <div className="text-[11px] text-neutral-400">
                <span>Parameters: </span>
                <code>{JSON.stringify(pendingConfirmation.params)}</code>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono-code text-neutral-300 hover:bg-neutral-800"
              >
                Abort Action
              </button>
              <button
                onClick={confirmPendingExecution}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-hud font-bold tracking-wider shadow-md"
              >
                AUTHORIZE & RUN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
