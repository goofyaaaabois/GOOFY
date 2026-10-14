import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import { fileURLToPath } from "url";
import {
  executeResilientChat,
  getServiceMetrics,
  ChatMessage,
} from "./src/server/geminiService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json());

// Logging middleware (censoring secrets)
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log(`[B.A.T. Server] ${req.method} ${req.path}`);
  }
  next();
});

// Health & System Telemetry Endpoint
app.get("/api/system/health", (_req: Request, res: Response) => {
  try {
    const metrics = getServiceMetrics();
    res.json({
      success: true,
      metrics,
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        cpuCores: os.cpus().length,
        freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
        nodeVersion: process.version,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error)?.message });
  }
});

// Standard Resilient Chat Endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      systemInstruction,
      temperature = 0.7,
      mock503Count = 0,
      forceFallback = false,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid request: messages array is required." });
    }

    const result = await executeResilientChat({
      messages: messages as ChatMessage[],
      systemInstruction,
      temperature: Number(temperature),
      mock503Count: Number(mock503Count) || 0,
      forceFallback: Boolean(forceFallback),
    });

    res.json(result);
  } catch (err: unknown) {
    console.error("[B.A.T. Server Error]", err);
    res.status(500).json({
      error: "Internal Server Error during AI execution",
      details: (err as Error)?.message || "Unknown error",
    });
  }
});

// Streaming Chat with Live Status Telemetry (SSE)
app.post("/api/chat/stream", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const {
      messages = [],
      systemInstruction,
      temperature = 0.7,
      mock503Count = 0,
      forceFallback = false,
    } = req.body;

    sendEvent("status", {
      state: "CONNECTED",
      message: "Establishing encrypted quantum link with Batcomputer...",
    });

    const result = await executeResilientChat({
      messages: messages as ChatMessage[],
      systemInstruction,
      temperature: Number(temperature),
      mock503Count: Number(mock503Count) || 0,
      forceFallback: Boolean(forceFallback),
      onStatusUpdate: (status) => {
        sendEvent("status", status);
      },
    });

    sendEvent("complete", result);
    res.end();
  } catch (err: unknown) {
    sendEvent("error", {
      message: (err as Error)?.message || "Streaming error encountered",
    });
    res.end();
  }
});

// Diagnostic Simulation Endpoint for real-time testing
app.post("/api/diagnostics/simulate", async (req: Request, res: Response) => {
  const { testType } = req.body;

  try {
    if (testType === "SIMULATE_503_RECOVERY") {
      // Simulate 2 consecutive 503 errors followed by successful recovery on attempt 3
      const result = await executeResilientChat({
        messages: [{ role: "user", content: "Batman diagnostic test: run Gotham 503 recovery protocol" }],
        mock503Count: 2,
      });
      return res.json({ success: true, testType, result });
    }

    if (testType === "SIMULATE_FALLBACK_FAILOVER") {
      // Force fallback to secondary model or local tactical brain
      const result = await executeResilientChat({
        messages: [{ role: "user", content: "Batman failover drill: activate backup neural node" }],
        forceFallback: true,
      });
      return res.json({ success: true, testType, result });
    }

    if (testType === "HEALTHY_CALL") {
      const result = await executeResilientChat({
        messages: [{ role: "user", content: "Batman, report current neural cluster latency." }],
        mock503Count: 0,
      });
      return res.json({ success: true, testType, result });
    }

    res.status(400).json({ error: "Unknown diagnostic test type" });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error)?.message });
  }
});

// Safe Computer Control & Tools Executor
app.post("/api/tools/execute", (req: Request, res: Response) => {
  const { toolName, parameters = {}, userConfirmed = false } = req.body;

  // Strict allowlist
  const ALLOWED_TOOLS = [
    "get_system_telemetry",
    "open_approved_destination",
    "save_intelligence_note",
    "query_local_files",
    "set_tactical_timer",
    "run_network_scan",
  ];

  if (!ALLOWED_TOOLS.includes(toolName)) {
    return res.status(403).json({
      success: false,
      error: `Security Violation: Tool '${toolName}' is not in the Batman security allowlist.`,
    });
  }

  // Consequential checks
  const CONSEQUENTIAL_TOOLS = ["open_approved_destination", "run_network_scan"];
  if (CONSEQUENTIAL_TOOLS.includes(toolName) && !userConfirmed) {
    return res.status(403).json({
      success: false,
      requiresConfirmation: true,
      toolName,
      parameters,
      message: `Security Protocol: Execution of '${toolName}' requires Batman biometric or manual authorization.`,
    });
  }

  // Execute tool safely
  switch (toolName) {
    case "get_system_telemetry": {
      const now = new Date();
      const gothamTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      return res.json({
        success: true,
        data: {
          os: `${os.type()} ${os.release()}`,
          hostname: os.hostname(),
          uptimeHours: (os.uptime() / 3600).toFixed(2),
          cpuCount: os.cpus().length,
          memoryUsagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
          localTime: now.toLocaleTimeString(),
          gothamTime: gothamTime.toLocaleTimeString(),
          defenseGridStatus: "OPTIMAL",
          neuralEncryption: "AES-256-GCM / Quantum-Safe",
        },
      });
    }

    case "open_approved_destination": {
      const destination = String(parameters.destination || "").toLowerCase();
      const ALLOWED_URLS: Record<string, string> = {
        github: "https://github.com",
        weather: "https://weather.com",
        calculator: "https://www.google.com/search?q=calculator",
        terminal_ui: "local://terminal",
        google: "https://google.com",
        news: "https://news.google.com",
      };

      const url = ALLOWED_URLS[destination];
      if (!url) {
        return res.status(400).json({
          success: false,
          error: `Destination '${destination}' is not in the approved destinations list.`,
        });
      }

      return res.json({
        success: true,
        action: "OPEN_URL",
        destination,
        targetUrl: url,
        message: `Approved destination '${destination}' validated and authorized by Batman.`,
      });
    }

    case "query_local_files": {
      // Safe sandboxed directory representation
      const sandboxDirectories = [
        { path: "/batcave/defense_matrix", files: ["perimeter_radar.dat", "laser_grid.cfg", "turret_firmware.bin"], access: "READ_ONLY" },
        { path: "/batcave/vehicles", files: ["batmobile_telemetry.log", "batwing_autopilot.json", "batcycle_status.txt"], access: "READ_ONLY" },
        { path: "/gotham/surveillance", files: ["arkham_perimeter.feed", "wayne_tower_relay.log", "blackgate_sensors.json"], access: "READ_ONLY" },
        { path: "/intelligence/cases", files: ["riddler_ciphers.enc", "joker_toxin_analysis.pdf", "penguin_shipping_manifest.csv"], access: "SECURE_READ" },
      ];
      return res.json({
        success: true,
        data: {
          directories: sandboxDirectories,
          totalFiles: 12,
          securityLevel: "LEVEL_5_WAYNE_ENTERPRISES",
        },
      });
    }

    case "run_network_scan": {
      return res.json({
        success: true,
        data: {
          scanTarget: "Batcave Local Perimeter & Gotham Relay Subnets",
          threatLevel: "ZERO_ACTIVE_BREACHES",
          openRelays: 4,
          encryptionIntegrity: "100%",
          latencyToGothamHubMs: 14,
          timestamp: new Date().toISOString(),
        },
      });
    }

    case "set_tactical_timer": {
      const seconds = Number(parameters.seconds) || 60;
      const label = String(parameters.label || "Tactical Patrol Reminder");
      return res.json({
        success: true,
        timer: {
          seconds,
          label,
          expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
        },
      });
    }

    default:
      return res.status(400).json({ success: false, error: "Tool execution unhandled" });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[B.A.T. AI Assistant Server] Online on port ${PORT}`);
    console.log(`[B.A.T. AI Assistant] Model: ${process.env.GEMINI_PRIMARY_MODEL || "gemini-3.8-flash"} (Fallback: ${process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
