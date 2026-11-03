import express from "express";
import { timingSafeEqual } from "node:crypto";
import { config, validateConfig } from "./config.js";
import { connectRea, closeRea, getReaTools } from "./reaClient.js";
import { runAgent } from "./orchestrator.js";
import {
  addMemory,
  closeMemoryStore,
  connectMemoryStore,
  createConversation,
  saveMessage,
  searchMemory
} from "./memoryStore.js";

validateConfig();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: config.maxRequestBytes }));

let ready = false;
let memoryReady = false;
let agentQueue: Promise<unknown> = Promise.resolve();

function runAgentSerial(messages: any[], signal: AbortSignal, memoryContext?: string) {
  const task = agentQueue.then(() => runAgent(messages, signal, memoryContext));
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

function requireMemory(res: express.Response) {
  if (memoryReady) return true;
  res.status(503).json({ error: "Persistent memory is unavailable. Configure DATABASE_URL and apply ai-core/migrations/001_memory.sql." });
  return false;
}

function validUserId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

app.get("/health", (_req, res) => {
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "starting",
    service: "omnimind-ai-core",
    reaConnected: ready && getReaTools().length > 0,
    memoryConnected: memoryReady
  });
});

app.get("/v1/rea/tools", authenticate, (_req, res) => {
  if (!ready) return res.status(503).json({ error: "AI Core is not ready." });
  res.json({ tools: getReaTools().map(({ name, description }) => ({ name, description })) });
});

app.post("/v1/conversations", authenticate, async (req, res) => {
  if (!requireMemory(res)) return;
  const { userId, title } = req.body || {};
  if (!validUserId(userId)) return res.status(400).json({ error: "A trusted userId is required." });
  try {
    res.status(201).json(await createConversation(userId, typeof title === "string" ? title : undefined));
  } catch {
    res.status(500).json({ error: "Could not create conversation." });
  }
});

app.post("/v1/conversations/:conversationId/messages", authenticate, async (req, res) => {
  if (!requireMemory(res)) return;
  const { userId, role, content } = req.body || {};
  if (!validUserId(userId) || !["user", "assistant"].includes(role) || typeof content !== "string" || !content.trim() || content.length > 100000) {
    return res.status(400).json({ error: "userId, role=user|assistant and non-empty content (max 100000 chars) are required." });
  }
  try {
    res.status(201).json(await saveMessage(userId, req.params.conversationId, role, content));
  } catch {
    res.status(404).json({ error: "Conversation not found for this user, or message could not be saved." });
  }
});

app.post("/v1/memory/ingest", authenticate, async (req, res) => {
  if (!requireMemory(res)) return;
  const { userId, sourceType, sourceId, content, metadata } = req.body || {};
  if (!validUserId(userId) || !["conversation", "document", "codebase", "note"].includes(sourceType) ||
      typeof content !== "string" || !content.trim() || content.length > 12000 ||
      (metadata !== undefined && (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)))) {
    return res.status(400).json({ error: "Valid userId, sourceType, content (max 12000 chars), and optional metadata object are required." });
  }
  try {
    res.status(201).json(await addMemory(userId, sourceType, content, typeof sourceId === "string" ? sourceId : undefined, metadata || {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory ingestion failed.";
    res.status(502).json({ error: message });
  }
});

app.post("/v1/memory/search", authenticate, async (req, res) => {
  if (!requireMemory(res)) return;
  const { userId, query, limit } = req.body || {};
  if (!validUserId(userId) || typeof query !== "string" || !query.trim() || query.length > 12000) {
    return res.status(400).json({ error: "Valid userId and query (max 12000 chars) are required." });
  }
  try {
    res.json({ memories: await searchMemory(userId, query, Number.isInteger(limit) ? limit : 6) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory search failed.";
    res.status(502).json({ error: message });
  }
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
    const userId = req.body?.userId;
    const conversationId = req.body?.conversationId;
    let memoryContext: string | undefined;
    const latestUserMessage = [...messages].reverse().find((item: any) => item.role === "user")?.content;

    if (userId !== undefined || conversationId !== undefined) {
      if (!memoryReady || !validUserId(userId) || typeof conversationId !== "string" || !/^[0-9a-f-]{36}$/i.test(conversationId)) {
        return res.status(400).json({ error: "When enabling persistence, provide a valid userId and conversationId and configure memory." });
      }
      if (typeof latestUserMessage === "string") {
        await saveMessage(userId, conversationId, "user", latestUserMessage);
        const memories = await searchMemory(userId, latestUserMessage, 6);
        memoryContext = memories
          .filter((item: any) => Number(item.similarity) >= 0.35)
          .map((item: any) => `[source=${item.source_type}; similarity=${Number(item.similarity).toFixed(2)}] ${item.content}`)
          .join("\\n\\n")
          .slice(0, 18000);
      }
    }

    const result = await runAgentSerial(messages, controller.signal, memoryContext);
    if (memoryReady && validUserId(userId) && typeof conversationId === "string" && typeof result.answer === "string" && result.answer) {
      await saveMessage(userId, conversationId, "assistant", result.answer);
    }
    if (!res.headersSent && !res.destroyed) res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent execution failed.";
    if (!res.headersSent && !res.destroyed) res.status(502).json({ error: message });
  }
});

const server = app.listen(config.port, "0.0.0.0", async () => {
  try {
    memoryReady = await connectMemoryStore();
    const tools = await connectRea();
    ready = true;
    console.log(`AI Core listening on :${config.port}; connected to REA with ${tools.length} tools; memory ${memoryReady ? "enabled" : "disabled"}.`);
  } catch (error) {
    console.error("AI Core startup failed:", error);
    server.close();
    process.exitCode = 1;
  }
});

async function shutdown() {
  server.close();
  await closeRea();
  await closeMemoryStore();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
