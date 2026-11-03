import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "./config.js";

export type ReaTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

let client: Client | undefined;
let transport: StdioClientTransport | undefined;
let tools: ReaTool[] = [];

export async function connectRea() {
  // REA's documented MCP interface is stdio, not an unauthenticated HTTP listener.
  transport = new StdioClientTransport({
    command: config.reaCommand,
    args: config.reaArgs,
    env: Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    )
  });
  client = new Client({ name: "omnimind-ai-core", version: "0.2.0" });
  await client.connect(transport);
  const result = await client.listTools();
  tools = (result.tools || []) as ReaTool[];
  if (tools.length === 0) throw new Error("REA connected but exposed no tools.");
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
