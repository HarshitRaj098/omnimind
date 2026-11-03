const numberFromEnv = (name: string, fallback: number, min: number, max: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(\`\${name} must be between \${min} and \${max}.\`);
  }
  return value;
};

const optionalNumber = (name: string, min: number, max: number) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(\`\${name} must be between \${min} and \${max}.\`);
  }
  return value;
};

function stringArrayFromEnv(name: string, fallback: string[]) {
  const raw = process.env[name];
  if (!raw) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(\`\${name} must be a JSON array of strings.\`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(\`\${name} must be a JSON array of strings.\`);
  }
  return parsed as string[];
}

export const config = {
  port: numberFromEnv("AI_CORE_PORT", 8787, 1, 65535),
  apiKey: process.env.AI_CORE_API_KEY || "",
  modelBaseUrl: (process.env.AI_CORE_MODEL_BASE_URL || "").replace(/\/+$/, ""),
  modelApiKey: process.env.AI_CORE_MODEL_API_KEY || "",
  model: process.env.AI_CORE_MODEL || "",
  reaCommand: process.env.REA_MCP_COMMAND || "npx",
  reaArgs: stringArrayFromEnv("REA_MCP_ARGS_JSON", ["-y", "rea-agents", "mcp"]),
  temperature: numberFromEnv("AI_CORE_TEMPERATURE", 0.2, 0, 2),
  topP: numberFromEnv("AI_CORE_TOP_P", 0.95, 0, 1),
  topK: optionalNumber("AI_CORE_TOP_K", 1, 1000),
  frequencyPenalty: numberFromEnv("AI_CORE_FREQUENCY_PENALTY", 0, -2, 2),
  presencePenalty: numberFromEnv("AI_CORE_PRESENCE_PENALTY", 0, -2, 2),
  maxTokens: numberFromEnv("AI_CORE_MAX_TOKENS", 8192, 1, 131072),
  maxToolRounds: numberFromEnv("AI_CORE_MAX_TOOL_ROUNDS", 8, 1, 20),
  requestTimeoutMs: numberFromEnv("AI_CORE_REQUEST_TIMEOUT_MS", 120000, 1000, 600000),
  maxRequestBytes: numberFromEnv("AI_CORE_MAX_REQUEST_BYTES", 2_000_000, 1024, 20_000_000),
  reasoningEffort: process.env.AI_CORE_REASONING_EFFORT || ""
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
