
import { GoogleGenAI } from "@google/genai";


export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any, context: any) => Promise<any>;
}

export class IntelligenceOrchestrator {
  private ai: GoogleGenAI;
  private tools: Tool[] = [];

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  registerTool(tool: Tool) {
    this.tools.push(tool);
  }

  async routeAndExecute(message: string, context: any) {
    const chat = this.ai.chats.create({
      model: "gemini-3.1-flash-lite",
      config: {
        tools: [{
          functionDeclarations: this.tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }]
      }
    });

    const response = await chat.sendMessage({ message: [{ text: message }] });
    
    // Check if the model wants to call a tool
    const functionCall = response.functionCalls?.[0];
    if (functionCall) {
      const tool = this.tools.find(t => t.name === functionCall.name);
      if (tool) {
        const result = await tool.execute(functionCall.args, context);
        // Feed result back
        const finalRes = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: tool.name,
              response: { result }
            }
          }]
        });
        return { type: "tool_result", content: finalRes.text };
      }
    }
    
    return { type: "direct", content: response.text };
  }
}

export const scrapeTool: Tool = {
  name: "scrape_url",
  description: "Fetches and extracts text content from a public URL.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to fetch" }
    },
    required: ["url"]
  },
  execute: async (args: { url: string }, context: any) => {
    try {
      const url = new URL(args.url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
      // Basic security
      if (["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Access denied");

      const res = await fetch(args.url, { signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const text = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { url: args.url, content: text.slice(0, 10000) };
    } catch (e: any) {
      return { error: e.message };
    }
  }
};

export const imagenTool: Tool = {
  name: "generate_image",
  description: "Generates an image from a text prompt.",
  parameters: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The image generation prompt" }
    },
    required: ["prompt"]
  },
  execute: async (args: { prompt: string }, context: any) => {
    return { status: "image_generation_initiated", prompt: args.prompt, url: "https://via.placeholder.com/512?text=Generated+Image" };
  }
};
