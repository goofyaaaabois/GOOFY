/**
 * B.A.T. Local Tactical Heuristic Brain (BAT-PROTO-7)
 * Serves as an offline, genuine fallback AI system when Gemini API is unavailable (503 Service Unavailable / 429 Rate Limit)
 * or when external connectivity is lost.
 * 
 * Never pretends to be Gemini when operating in fallback mode; clearly identifies itself as BAT-PROTO-7.
 */

export interface TacticalResponse {
  text: string;
  provider: string;
  modelUsed: string;
  latencyMs: number;
  toolSuggestion?: {
    tool: string;
    parameters: Record<string, unknown>;
  };
}

export function generateLocalTacticalResponse(
  prompt: string,
  history: Array<{ role: string; content: string }> = []
): TacticalResponse {
  const start = Date.now();
  const lower = prompt.toLowerCase().trim();

  let reply = "";
  let toolSuggestion: TacticalResponse['toolSuggestion'];

  // Check for Tamil / Tanglish triggers
  const isTamilOrTanglish = 
    lower.includes("eppadi") || 
    lower.includes("vanakkam") || 
    lower.includes("irukinga") || 
    lower.includes("irukenga") ||
    lower.includes("nalla") ||
    lower.includes("pannu") ||
    lower.includes("sollu") ||
    lower.includes("enna") ||
    lower.includes("tamil");

  // Specific intents
  if (lower.includes("status") || lower.includes("diagnostic") || lower.includes("health") || lower.includes("telemetry")) {
    reply = isTamilOrTanglish
      ? "Vanakkam Batman. B.A.T. system status optimal-ah irukku. External Gemini network 503 overload irundhaalum, local tactical core BAT-PROTO-7 actively monitoring Gotham surveillance grid. All sub-routines operational."
      : "All systems nominal, Batman. While external Gemini neural clusters experienced temporary high-demand (HTTP 503), local tactical sub-routines (BAT-PROTO-7) have engaged with zero downtime. Batcave power reserves, defense grid, and memory banks are fully operational.";
    toolSuggestion = { tool: "get_system_telemetry", parameters: {} };
  } else if (lower.includes("time") || lower.includes("date") || lower.includes("clock")) {
    const now = new Date();
    const gothamTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    reply = `Local timestamp: ${now.toLocaleTimeString()} (${now.toLocaleDateString()}). Gotham City tactical time (UTC-4): ${gothamTime.toLocaleTimeString()}. Night patrol schedule remains on standby, Batman.`;
  } else if (lower.includes("note") || lower.includes("remember") || lower.includes("save") || lower.includes("memory")) {
    reply = isTamilOrTanglish
      ? "Batman, tactical memory vault ready. Storing this intelligence locally in our encrypted SQLite/IndexedDB vault. Enna title-la save pannanum?"
      : "Understood, Batman. I can log this intelligence immediately into your encrypted Memory Vault. Please confirm the memory classification or click the Vault tab to review.";
    toolSuggestion = { tool: "save_intelligence_note", parameters: { content: prompt } };
  } else if (lower.includes("open") && (lower.includes("github") || lower.includes("browser") || lower.includes("calc") || lower.includes("terminal") || lower.includes("weather"))) {
    let dest = "terminal";
    if (lower.includes("github")) dest = "github";
    else if (lower.includes("weather")) dest = "weather";
    else if (lower.includes("calc")) dest = "calculator";

    reply = `Initiating computer control sequence to launch ${dest.toUpperCase()}. Awaiting your security confirmation on the tactical console, Batman.`;
    toolSuggestion = { tool: "open_approved_destination", parameters: { destination: dest } };
  } else if (lower.includes("who are you") || lower.includes("identity") || lower.includes("batman")) {
    reply = isTamilOrTanglish
      ? "Naan B.A.T. — Batman Assistent Transformer. Ungaloda personal tactical AI. Cloud service offline-ah irundhaalum, ungalukku help panna offline protocol-la epovum ready-ah iruppen, Batman."
      : "I am B.A.T. — Batman Assistent Transformer. Your dedicated tactical intelligence assistant. When Google Gemini neural networks experience peak traffic or 503 overloads, my offline BAT-PROTO-7 core maintains continuity across Gotham operations.";
  } else if (isTamilOrTanglish) {
    reply = `Vanakkam Batman! Cloud Gemini clusters high load-la irukku (503 overload), aana ungaloda B.A.T. offline tactical engine activated. Ungalukku enna help venum? Code, system controls, memory management ellaame ready-ah irukku.`;
  } else if (lower.includes("code") || lower.includes("python") || lower.includes("bug") || lower.includes("function") || lower.includes("error")) {
    reply = `Analyzing technical query in fallback tactical mode, Batman:\n\n` +
      `When building resilient AI architectures:\n` +
      `1. Catch HTTP 503, 429, and 500 errors.\n` +
      `2. Implement Exponential Backoff with Jitter: delay = Math.min(maxWait, base * (2 ** attempt) + randomJitter).\n` +
      `3. Fallback dynamically to secondary models like 'gemini-3.1-flash-lite' or local fallback.\n` +
      `4. Maintain user context and abort controllers to prevent stale network hangs.\n\n` +
      `Primary model will automatically resume once the Gemini cluster stabilizes.`;
  } else {
    reply = `Tactical fallback protocol BAT-PROTO-7 active. I have received your directive: "${prompt}". ` +
      `External Gemini servers were temporarily congested (503 Service Unavailable), but your request has been cataloged. You can ask for system diagnostics, file controls, notes, or rerun the query once the primary node clears.`;
  }

  return {
    text: reply,
    provider: "BAT-PROTO-7 (Offline Tactical Brain)",
    modelUsed: "bat-proto-7-local",
    latencyMs: Date.now() - start,
    toolSuggestion
  };
}
