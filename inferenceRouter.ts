export interface CompatibleChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

export interface CompatibleChatOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  messages: CompatibleChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Opens a stream from an OpenAI-compatible chat-completions endpoint.
 * Supports Ollama, llama.cpp servers, and compatible hosted/self-hosted APIs.
 * The adapter intentionally exposes text only; tools and web grounding remain
 * with the primary provider until each provider has a safe tool-call adapter.
 */
export async function streamCompatibleChat(
  options: CompatibleChatOptions
): Promise<AsyncIterable<{ text: string }>> {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error("AI_COMPATIBLE_BASE_URL must be an HTTP(S) URL.");
  }
  if (!options.model.trim()) {
    throw new Error("AI_COMPATIBLE_MODEL is required when the compatible provider is enabled.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream"
  };
  if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      stream: true
    }),
    signal: options.signal || AbortSignal.timeout(120_000)
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1200);
    throw new Error(`Compatible AI provider returned HTTP ${response.status}: ${detail || response.statusText}`);
  }
  if (!response.body) throw new Error("Compatible AI provider returned no response stream.");

  async function* readStream(): AsyncGenerator<{ text: string }> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n/);
        buffer = events.pop() || "";

        for (const line of events) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let parsed: any;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) yield { text: delta };
          else if (Array.isArray(delta)) {
            for (const part of delta) {
              if (typeof part?.text === "string" && part.text) yield { text: part.text };
            }
          }
          if (parsed?.error) {
            throw new Error(typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error));
          }
        }
        if (done) break;
      }
      if (buffer.startsWith("data:")) {
        const payload = buffer.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) yield { text: delta };
          } catch {
            // Ignore a truncated final SSE event; already received text remains valid.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return readStream();
}
