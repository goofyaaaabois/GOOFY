import React, { useState } from 'react';
import {
  Activity,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { DiagnosticRun } from '../types/batman.ts';

interface ResilienceDiagnosticsProps {
  onRunTest: (testType: string) => Promise<{
    success: boolean;
    durationMs: number;
    log: string[];
    result?: unknown;
  }>;
}

export const ResilienceDiagnostics: React.FC<ResilienceDiagnosticsProps> = ({ onRunTest }) => {
  const [tests, setTests] = useState<DiagnosticRun[]>([
    {
      id: 'SIMULATE_503_RECOVERY',
      title: 'HTTP 503 High-Demand Exponential Backoff & Recovery',
      description: 'Simulates 2 consecutive 503 Service Unavailable errors. Verifies exponential backoff with jitter and successful recovery on retry attempt 3.',
      status: 'PENDING',
      log: [],
    },
    {
      id: 'SIMULATE_FALLBACK_FAILOVER',
      title: 'Secondary Model Failover (gemini-3.1-flash-lite)',
      description: 'Simulates primary node unavailability and verifies smooth transition to secondary fallback model or BAT-PROTO-7 tactical core.',
      status: 'PENDING',
      log: [],
    },
    {
      id: 'HEALTHY_CALL',
      title: 'Primary Neural Cluster Health Check',
      description: 'Executes a normal ping to the active Gemini cluster and validates latency, headers, and token streaming.',
      status: 'PENDING',
      log: [],
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const runSingleTest = async (testId: string) => {
    setActiveTestId(testId);
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'RUNNING', log: ['Initializing test runner...'] } : t))
    );

    try {
      const outcome = await onRunTest(testId);
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: outcome.success ? 'SUCCESS' : 'FAILED',
                durationMs: outcome.durationMs,
                log: outcome.log,
              }
            : t
        )
      );
    } catch (err: unknown) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: 'FAILED',
                log: [`[FATAL TEST FAILURE] ${(err as Error)?.message || 'Unexpected test crash'}`],
              }
            : t
        )
      );
    } finally {
      setActiveTestId(null);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of tests) {
      await runSingleTest(test.id);
    }
    setIsRunningAll(false);
  };

  const passedCount = tests.filter((t) => t.status === 'SUCCESS').length;
  const failedCount = tests.filter((t) => t.status === 'FAILED').length;

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="font-hud text-xs tracking-wider font-bold text-amber-400 uppercase">
            Resilience & 503 Diagnostics Suite
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono-code text-neutral-400">
            Passed: <strong className="text-emerald-400">{passedCount}</strong> / {tests.length}
          </span>
          <button
            onClick={runAllTests}
            disabled={isRunningAll || activeTestId !== null}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-hud font-bold rounded transition-all shadow-md"
          >
            {isRunningAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>RUN ALL DIAGNOSTICS</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono-code">
        <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <span className="text-neutral-400">Backoff Strategy:</span>
          <span className="text-amber-400 font-bold">Exponential + Full Jitter</span>
        </div>
        <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <span className="text-neutral-400">Max Retries:</span>
          <span className="text-amber-400 font-bold">3 attempts</span>
        </div>
        <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <span className="text-neutral-400">Secondary Fallback:</span>
          <span className="text-amber-400 font-bold">gemini-3.1-flash-lite</span>
        </div>
      </div>

      {/* Tests List */}
      <div className="space-y-3">
        {tests.map((test) => {
          const isCurrent = activeTestId === test.id;
          return (
            <div
              key={test.id}
              className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {test.status === 'SUCCESS' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : test.status === 'FAILED' ? (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : test.status === 'RUNNING' ? (
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                  <span className="font-hud text-xs font-bold text-neutral-200">
                    {test.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {test.durationMs !== undefined && (
                    <span className="text-[10px] font-mono-code text-neutral-400">
                      {test.durationMs}ms
                    </span>
                  )}
                  <button
                    onClick={() => runSingleTest(test.id)}
                    disabled={activeTestId !== null || isRunningAll}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 border border-neutral-700 text-[11px] font-mono-code text-neutral-300 hover:text-amber-400 transition-colors"
                  >
                    {isCurrent ? 'Running...' : 'Run Test'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] font-mono-code text-neutral-400">
                {test.description}
              </p>

              {/* Log Stream if test ran */}
              {test.log.length > 0 && (
                <div className="mt-1 p-2 rounded bg-black/80 border border-neutral-800 font-mono-code text-[11px] text-amber-300/90 space-y-0.5 max-h-32 overflow-y-auto">
                  {test.log.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-neutral-400 select-none">&gt;</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
