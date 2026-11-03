import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from "./config.js";

export type ReaTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

let client: Client | undefined;
let transport: StreamableHTTPClientTransport | undefined;
let tools: ReaTool[] = [];

export async function connectRea() {
  const url = new URL(config.reaUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("REA_MCP_URL must use HTTP or HTTPS.");
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "::1" && url.hostname !== "localhost") {
    throw new Error("REA MCP must remain on loopback. Do not expose its unauthenticated HTTP transport publicly.");
  }

  transport = new StreamableHTTPClientTransport(url);
  client = new Client({ name: "omnimind-ai-core", version: "0.1.0" });
  await client.connect(transport);
  const result = await client.listTools();
  tools = (result.tools || []) as ReaTool[];
  return tools;
}

export function getReaTools() {
  return tools;
}

export async function callReaTool(name: string, args: Record<string, unknown>) {
  if (!client) throw new Error("REA is not connected.");
  return client.callTool({ name, arguments: args });
}

export async function closeRea() {
  try {
    await client?.close();
  } finally {
    client = undefined;
    transport = undefined;
    tools = [];
  }
}
