import { Pool } from "pg";
import { config } from "./config.js";

type MemorySource = "conversation" | "document" | "codebase" | "note";

let pool: Pool | undefined;

function getPool() {
  if (!pool) throw new Error("Memory database is not configured. Set DATABASE_URL.");
  return pool;
}

async function embed(text: string): Promise<number[]> {
  if (!config.embeddingModel || !config.modelBaseUrl || !config.modelApiKey) {
    throw new Error("Set AI_CORE_EMBEDDING_MODEL and AI_CORE_MODEL_API_KEY to enable semantic memory.");
  }
  const response = await fetch(`${config.modelBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.modelApiKey}`
    },
    body: JSON.stringify({ model: config.embeddingModel, input: text.slice(0, 12000) }),
    signal: AbortSignal.timeout(config.requestTimeoutMs)
  });
  if (!response.ok) {
    throw new Error(`Embedding provider HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  const payload = await response.json() as any;
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1536 || vector.some((n: unknown) => typeof n !== "number" || !Number.isFinite(n))) {
    throw new Error("Embedding model must return exactly 1536 numeric dimensions to match the pgvector schema.");
  }
  return vector;
}

export async function connectMemoryStore() {
  if (!config.databaseUrl) return false;
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(config.databaseUrl.startsWith("postgres://") || config.databaseUrl.startsWith("postgresql://")
      ? { ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined }
      : {})
  });
  await pool.query("SELECT 1");
  return true;
}

export async function createConversation(userId: string, title = "New conversation") {
  const result = await getPool().query(
    "INSERT INTO ai_memory_conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at",
    [userId, title.slice(0, 200)]
  );
  return result.rows[0];
}

export async function saveMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string) {
  const db = getPool();
  const result = await db.query(
    "INSERT INTO ai_memory_messages (user_id, conversation_id, role, content) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
    [userId, conversationId, role, content]
  );
  await db.query(
    "UPDATE ai_memory_conversations SET updated_at = NOW() WHERE id = $1 AND user_id = $2",
    [conversationId, userId]
  );
  return result.rows[0];
}

export async function addMemory(userId: string, sourceType: MemorySource, content: string, sourceId?: string, metadata: Record<string, unknown> = {}) {
  const vector = await embed(content);
  const result = await getPool().query(
    `INSERT INTO ai_memory_chunks (user_id, source_type, source_id, content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
     RETURNING id, source_type, source_id, created_at`,
    [userId, sourceType, sourceId || null, content, JSON.stringify(metadata), `[${vector.join(",")}]`]
  );
  return result.rows[0];
}

export async function searchMemory(userId: string, query: string, limit = 6) {
  const vector = await embed(query);
  const result = await getPool().query(
    `SELECT id, source_type, source_id, content, metadata,
            1 - (embedding <=> $2::vector) AS similarity
     FROM ai_memory_chunks
     WHERE user_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [userId, `[${vector.join(",")}]`, Math.max(1, Math.min(limit, 20))]
  );
  return result.rows;
}

export async function closeMemoryStore() {
  if (pool) await pool.end();
  pool = undefined;
}
