import express from "express";
import { timingSafeEqual } from "node:crypto";
import { config, validateConfig } from "./config.js";
import { connectRea, closeRea, getReaTools } from "./reaClient.js";
import { runAgent } from "./orchestrator.js";

validateConfig();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: config.maxRequestBytes }));

let ready = false;
let agentQueue: Promise<unknown> = Promise.resolve();
function runAgentSerial(messages: any[], signal: AbortSignal) {
  const task = agentQueue.then(() => runAgent(messages, signal));
  agentQueue = task.catch(() => undefined);
  return task;
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const supplied = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = Buffer.from(config.apiKey);
  const candidate = Buffer.from(supplied);
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting", service: "omnimind-ai-core", reaConnected: ready && getReaTools().length > 0 });
});

app.get("/v1/rea/tools", authenticate, (_req, res) => {
  if (!ready) return res.status(503).json({ error: "AI Core is not ready." });
  res.json({ tools: getReaTools().map(({ name, description }) => ({ name, description })) });
});

app.post("/v1/agent/run", authenticate, async (req, res) => {
  if (!ready) return res.status(503).json({ error: "AI Core is not ready; REA is not connected." });
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
    return res.status(400).json({ error: "messages must be a non-empty array with at most 100 entries." });
  }
  for (const item of messages) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      return res.status(400).json({ error: "Each message must contain role=user|assistant and string content." });
    }
  }

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const result = await runAgentSerial(messages, controller.signal);
    if (!res.headersSent && !res.destroyed) res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent execution failed.";
    if (!res.headersSent && !res.destroyed) res.status(502).json({ error: message });
  }
});

const server = app.listen(config.port, "0.0.0.0", async () => {
  try {
    const tools = await connectRea();
    ready = true;
    console.log(`AI Core listening on :${config.port}; connected to REA with ${tools.length} tools.`);
  } catch (error) {
    console.error("REA connection failed; API remains unavailable until restart:", error);
    server.close();
    process.exitCode = 1;
  }
});

async function shutdown() {
  server.close();
  await closeRea();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
