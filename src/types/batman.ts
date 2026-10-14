export type AssistantStatus = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'THINKING' 
  | 'SPEAKING' 
  | 'RETRYING' 
  | 'FALLBACK' 
  | 'ERROR';

export type LanguageMode = 'EN' | 'TAMIL' | 'TANGLISH';

export interface RetryEvent {
  attempt: number;
  error: string;
  statusCode?: number;
  delayMs: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: 'PRIMARY_GEMINI' | 'FALLBACK_GEMINI' | 'OFFLINE_BAT_TACTICAL';
  modelUsed?: string;
  latencyMs?: number;
  retries?: number;
  recoveredFrom503?: boolean;
  retryLog?: RetryEvent[];
  toolCall?: {
    tool: string;
    parameters: Record<string, unknown>;
  };
}

export interface MemoryRecord {
  id: string;
  title: string;
  category: 'TACTICAL' | 'PREFERENCE' | 'REMINDER' | 'GOTHAM_INTEL' | 'CODE';
  content: string;
  createdAt: string;
  pinned: boolean;
}

export interface SystemTelemetry {
  os: string;
  hostname: string;
  uptimeHours: string;
  cpuCount: number;
  memoryUsagePercent: number;
  localTime: string;
  gothamTime: string;
  defenseGridStatus: string;
  neuralEncryption: string;
  apiConnected: boolean;
  activeProvider: string;
  activeModel: string;
  pingMs: number;
  batteryLevel?: number;
}

export interface DiagnosticRun {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  durationMs?: number;
  log: string[];
}
