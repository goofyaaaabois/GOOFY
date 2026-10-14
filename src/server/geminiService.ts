import { GoogleGenAI } from "@google/genai";
import { generateLocalTacticalResponse } from "./localTacticalBrain.ts";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestOptions {
  messages: ChatMessage[];
  systemInstruction?: string;
  temperature?: number;
  mock503Count?: number;
  forceFallback?: boolean;
  onStatusUpdate?: (status: {
    state: "THINKING" | "RETRYING" | "FALLBACK" | "CONNECTED" | "ERROR";
    message: string;
    attempt?: number;
    delayMs?: number;
    model?: string;
    provider?: string;
  }) => void;
}

export interface ChatResponseResult {
  text: string;
  modelUsed: string;
  provider: "PRIMARY_GEMINI" | "FALLBACK_GEMINI" | "OFFLINE_BAT_TACTICAL";
  attempts: number;
  retries: number;
  latencyMs: number;
  recoveredFrom503: boolean;
  retryLog: Array<{
    attempt: number;
    error: string;
    statusCode?: number;
    delayMs: number;
    timestamp: number;
  }>;
  toolCall?: {
    tool: string;
    parameters: Record<string, unknown>;
  };
}

export interface ServiceMetrics {
  totalRequests: number;
  totalRetries: number;
  successful503Recoveries: number;
  fallbackActivations: number;
  primaryModel: string;
  fallbackModel: string;
  hasApiKey: boolean;
  status: "ONLINE" | "DEGRADED" | "OFFLINE_FALLBACK";
  uptimeSeconds: number;
  startedAt: number;
}

const startTime = Date.now();
const metrics: ServiceMetrics = {
  totalRequests: 0,
  totalRetries: 0,
  successful503Recoveries: 0,
  fallbackActivations: 0,
  primaryModel: process.env.GEMINI_PRIMARY_MODEL || "gemini-3.8-flash",
  fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
  hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
  status: "ONLINE",
  uptimeSeconds: 0,
  startedAt: startTime,
};

// Singleton SDK instance using official guidelines
let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

const DEFAULT_BATMAN_INSTRUCTION = `
You are B.A.T. (Batman Assistent Transformer) — the sophisticated, highly intelligent, and tactically precise personal AI assistant for Batman.
Guidelines:
1. Tone & Persona: Speak calmly, authoritatively, intelligently, with dry wit and tactical alertness.
2. Form of Address: Address the user as "Batman", "Master Wayne", or "Sir" when appropriate.
3. Language Proficiency: Understand and seamlessly speak in English, Tamil, and Tanglish (Tamil-English code-switching, e.g. "Vanakkam Batman, system status optimal-ah irukku. Gotham surveillance active."). Adapt instantly to whatever language the user speaks.
4. Problem Solving: Provide sharp, concise answers by default, and deep technical or architectural explanations when requested.
5. Accuracy & Honesty: Never pretend an action succeeded if it failed. If a computer action requires user confirmation, clearly state what needs authorization.
6. Identity: You are B.A.T., engineered with military-grade tactical routines, resilient retry systems, and adaptive AI neural frameworks.
`;

/**
 * Calculates exponential backoff with full jitter to avoid thundering herd problem.
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 8000,
  jitterMs = 600
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * jitterMs;
  return Math.min(maxDelayMs, exponential + jitter);
}

/**
 * Inspects error objects to classify if it is transient (503, 429, 500, network failure).
 */
function isTransientError(error: unknown): {
  isTransient: boolean;
  statusCode?: number;
  reason: string;
  retryAfterMs?: number;
} {
  const errStr = String(error);
  const errMsg = (error as { message?: string })?.message || errStr;
  const status = (error as { status?: number; statusCode?: number })?.status ||
    (error as { status?: number; statusCode?: number })?.statusCode;

  // Check Retry-After header if passed through SDK or fetch
  let retryAfterMs: number | undefined;
  if ((error as { headers?: Headers | Record<string, string> })?.headers) {
    const headers = (error as { headers?: { get?: (k: string) => string | null } }).headers;
    const retryHeader = typeof headers?.get === "function" ? headers.get("retry-after") : undefined;
    if (retryHeader) {
      const parsedSeconds = parseInt(retryHeader, 10);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        retryAfterMs = parsedSeconds * 1000;
      }
    }
  }

  // 503 Service Unavailable / Overloaded
  if (status === 503 || errMsg.includes("503") || errMsg.includes("Service Unavailable") || errMsg.includes("overloaded") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE")) {
    return { isTransient: true, statusCode: 503, reason: "503 Service Unavailable (Model Overloaded / High Demand)", retryAfterMs };
  }

  // 429 Resource Exhausted / Rate Limit
  if (status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("rate limit") || errMsg.includes("quota")) {
    return { isTransient: true, statusCode: 429, reason: "429 Resource Exhausted (Rate Limit / Quota)", retryAfterMs };
  }

  // 500/502/504 Server / Gateway / Timeout
  if (status === 500 || status === 502 || status === 504 || errMsg.includes("504") || errMsg.includes("Gateway Timeout") || errMsg.includes("ECONNRESET") || errMsg.includes("ETIMEDOUT") || errMsg.includes("fetch failed")) {
    return { isTransient: true, statusCode: status || 500, reason: "Network / Gateway Transient Disruption", retryAfterMs };
  }

  // Non-transient errors (invalid argument, auth, 401, 403, 404)
  if (status === 400 || status === 401 || status === 403 || errMsg.includes("API key not valid") || errMsg.includes("PERMISSION_DENIED")) {
    return { isTransient: false, statusCode: status || 401, reason: "Permanent Authentication or Validation Error" };
  }

  return { isTransient: false, reason: "Unclassified Error" };
}

/**
 * Execute a single call with a strict timeout to prevent hangs.
 */
async function callGeminiWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  contents: string,
  systemInstruction: string,
  temperature = 0.7,
  timeoutMs = 25000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const promise = ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature,
      },
    });

    const response = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new Error(`Timeout: Gemini API request exceeded ${timeoutMs}ms`));
        });
      }),
    ]);

    clearTimeout(timeoutId);
    return response.text || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Resilient Chat Execution Function.
 * Orchestrates Primary Model -> Retries (with backoff & jitter) -> Secondary Fallback -> BAT-PROTO-7 Local Tactical Brain.
 */
export async function executeResilientChat(
  options: ChatRequestOptions
): Promise<ChatResponseResult> {
  const startTimeMs = Date.now();
  metrics.totalRequests += 1;

  const {
    messages,
    systemInstruction = DEFAULT_BATMAN_INSTRUCTION,
    temperature = 0.7,
    mock503Count = 0,
    forceFallback = false,
    onStatusUpdate,
  } = options;

  const userMessages = messages.filter((m) => m.role === "user");
  const latestPrompt = userMessages[userMessages.length - 1]?.content || "Batman status report";

  // Build simplified conversation prompt for the model
  const formattedPrompt = messages
    .map((m) => `${m.role === "assistant" ? "B.A.T." : "Batman"}: ${m.content}`)
    .join("\n");

  const retryLog: ChatResponseResult["retryLog"] = [];
  let attempts = 0;
  let retries = 0;
  let simulated503Left = mock503Count;
  let recoveredFrom503 = false;

  const apiKey = process.env.GEMINI_API_KEY;
  metrics.hasApiKey = Boolean(apiKey && apiKey.length > 5);

  // If forced fallback or API key is totally missing, activate genuine fallback immediately
  if (forceFallback || !metrics.hasApiKey) {
    onStatusUpdate?.({
      state: "FALLBACK",
      message: forceFallback
        ? "Fallback mode explicitly activated. Engaging secondary model or BAT-PROTO-7 tactical core."
        : "Gemini API key not configured in environment. Routing directly to offline BAT-PROTO-7 tactical intelligence.",
      provider: "BAT-PROTO-7",
    });

    metrics.fallbackActivations += 1;
    const tactical = generateLocalTacticalResponse(
      latestPrompt,
      messages.map((m) => ({ role: m.role, content: m.content }))
    );

    return {
      text: tactical.text,
      modelUsed: tactical.modelUsed,
      provider: "OFFLINE_BAT_TACTICAL",
      attempts: 1,
      retries: 0,
      latencyMs: Date.now() - startTimeMs,
      recoveredFrom503: false,
      retryLog: [
        {
          attempt: 1,
          error: forceFallback ? "Forced Fallback Active" : "No GEMINI_API_KEY provided",
          delayMs: 0,
          timestamp: Date.now(),
        },
      ],
      toolCall: tactical.toolSuggestion,
    };
  }

  const ai = getAIClient();
  const primaryModel = metrics.primaryModel;
  const secondaryModel = metrics.fallbackModel;
  const maxAttempts = 4; // Initial attempt + up to 3 retries

  // Step 1: Attempt Primary Model with Exponential Backoff
  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      onStatusUpdate?.({
        state: "THINKING",
        message: attempts === 1
          ? `Establishing secure uplink with primary neural cluster (${primaryModel})...`
          : `Retry attempt ${attempts - 1}/3 with primary model (${primaryModel})...`,
        attempt: attempts,
        model: primaryModel,
        provider: "PRIMARY_GEMINI",
      });

      // Handle diagnostic simulation of 503 error
      if (simulated503Left > 0) {
        simulated503Left -= 1;
        const simErr = new Error("503 Service Unavailable: High-demand on neural model cluster (Simulated for testing)");
        (simErr as unknown as { status: number }).status = 503;
        throw simErr;
      }

      // Real primary API call
      const replyText = await callGeminiWithTimeout(
        ai,
        primaryModel,
        formattedPrompt,
        systemInstruction,
        temperature
      );

      if (retries > 0) {
        recoveredFrom503 = true;
        metrics.successful503Recoveries += 1;
        metrics.status = "ONLINE";
      }

      return {
        text: replyText,
        modelUsed: primaryModel,
        provider: "PRIMARY_GEMINI",
        attempts,
        retries,
        latencyMs: Date.now() - startTimeMs,
        recoveredFrom503,
        retryLog,
      };
    } catch (err: unknown) {
      const errInfo = isTransientError(err);
      retries += 1;
      metrics.totalRetries += 1;

      // Calculate delay with exponential backoff & jitter (or honor Retry-After)
      const delayMs = errInfo.retryAfterMs ?? calculateBackoffDelay(attempts - 1, 1000, 7000, 600);

      retryLog.push({
        attempt: attempts,
        error: String((err as Error)?.message || err),
        statusCode: errInfo.statusCode,
        delayMs,
        timestamp: Date.now(),
      });

      // If permanent error (e.g. invalid key 401/400), don't retry endlessly
      if (!errInfo.isTransient) {
        console.error(`[B.A.T. Service] Permanent error encountered:`, (err as Error)?.message);
        break; // break out to secondary or tactical fallback
      }

      // If we still have retry budget with the primary model
      if (attempts < maxAttempts) {
        onStatusUpdate?.({
          state: "RETRYING",
          message: `Primary cluster returned ${errInfo.reason}. Backing off for ${(delayMs / 1000).toFixed(1)}s (Retry ${attempts}/3)...`,
          attempt: attempts,
          delayMs,
          model: primaryModel,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // Step 2: Primary exhausted or permanent failure -> Transition to Secondary Fallback Model
  onStatusUpdate?.({
    state: "FALLBACK",
    message: `Primary cluster (${primaryModel}) temporarily unavailable. Seamlessly failover to secondary neural node (${secondaryModel})...`,
    model: secondaryModel,
    provider: "FALLBACK_GEMINI",
  });

  metrics.fallbackActivations += 1;
  metrics.status = "DEGRADED";

  try {
    const fallbackText = await callGeminiWithTimeout(
      ai,
      secondaryModel,
      formattedPrompt,
      systemInstruction,
      temperature,
      15000 // Fast 15s timeout for fallback
    );

    return {
      text: `[FALLBACK ALERT: Primary cluster experienced 503 high-demand; secondary node ${secondaryModel} engaged]\n\n${fallbackText}`,
      modelUsed: secondaryModel,
      provider: "FALLBACK_GEMINI",
      attempts: attempts + 1,
      retries,
      latencyMs: Date.now() - startTimeMs,
      recoveredFrom503: true,
      retryLog,
    };
  } catch (secondaryErr: unknown) {
    retryLog.push({
      attempt: attempts + 1,
      error: `Secondary model (${secondaryModel}) also failed: ${String((secondaryErr as Error)?.message || secondaryErr)}`,
      statusCode: (secondaryErr as { status?: number })?.status,
      delayMs: 0,
      timestamp: Date.now(),
    });
  }

  // Step 3: Complete external outage -> Autonomous Local Tactical Brain (BAT-PROTO-7)
  metrics.status = "OFFLINE_FALLBACK";
  onStatusUpdate?.({
    state: "FALLBACK",
    message: "External neural network unreachable. Activating local BAT-PROTO-7 tactical core.",
    provider: "BAT-PROTO-7",
  });

  const localResult = generateLocalTacticalResponse(
    latestPrompt,
    messages.map((m) => ({ role: m.role, content: m.content }))
  );

  return {
    text: `[TACTICAL OFFLINE CORE ACTIVE: All cloud nodes congested (503). Running on local BAT-PROTO-7 sub-routines]\n\n${localResult.text}`,
    modelUsed: localResult.modelUsed,
    provider: "OFFLINE_BAT_TACTICAL",
    attempts: attempts + 2,
    retries,
    latencyMs: Date.now() - startTimeMs,
    recoveredFrom503: false,
    retryLog,
    toolCall: localResult.toolSuggestion,
  };
}

/**
 * Returns service health and uptime telemetry.
 */
export function getServiceMetrics(): ServiceMetrics {
  metrics.uptimeSeconds = Math.floor((Date.now() - metrics.startedAt) / 1000);
  metrics.hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  return { ...metrics };
}
