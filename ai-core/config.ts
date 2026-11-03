const numberFromEnv = (name: string, fallback: number, min: number, max: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return value;
};

export const config = {
  port: numberFromEnv("AI_CORE_PORT", 8787, 1, 65535),
  apiKey: process.env.AI_CORE_API_KEY || "",
  modelBaseUrl: (process.env.AI_CORE_MODEL_BASE_URL || "").replace(/\/+$/, ""),
  modelApiKey: process.env.AI_CORE_MODEL_API_KEY || "",
  model: process.env.AI_CORE_MODEL || "",
  reaUrl: process.env.REA_MCP_URL || "http://127.0.0.1:8765/mcp",
  temperature: numberFromEnv("AI_CORE_TEMPERATURE", 0.2, 0, 2),
  topP: numberFromEnv("AI_CORE_TOP_P", 0.95, 0, 1),
  maxTokens: numberFromEnv("AI_CORE_MAX_TOKENS", 8192, 1, 131072),
  maxToolRounds: numberFromEnv("AI_CORE_MAX_TOOL_ROUNDS", 8, 1, 20),
  requestTimeoutMs: numberFromEnv("AI_CORE_REQUEST_TIMEOUT_MS", 120000, 1000, 600000),
  maxRequestBytes: numberFromEnv("AI_CORE_MAX_REQUEST_BYTES", 2_000_000, 1024, 20_000_000)
};

export function validateConfig() {
  if (!config.apiKey || config.apiKey.length < 32) {
    throw new Error("AI_CORE_API_KEY must be set to a random secret of at least 32 characters.");
  }
  if (!config.modelBaseUrl || !/^https?:\/\//i.test(config.modelBaseUrl)) {
    throw new Error("AI_CORE_MODEL_BASE_URL must be an HTTP(S) OpenAI-compatible endpoint.");
  }
  if (!config.model) throw new Error("AI_CORE_MODEL is required.");
}
