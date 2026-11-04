# OmniMind local AI setup (no hosted LLM API key)

OmniMind chat now defaults to a self-hosted OpenAI-compatible inference endpoint. The intended zero-API-key setup is **Ollama running beside the OmniMind backend**.

## Run it locally

1. Install Ollama from https://ollama.com/download
2. Download a small model:

```bash
ollama pull qwen2.5:3b
```

3. Start Ollama (the installer may already run it):

```bash
ollama serve
```

4. In another terminal, configure OmniMind:

```bash
cp .env.example .env
```

Keep these values in `.env`:

```env
AI_PROVIDER=local
AI_COMPATIBLE_BASE_URL=http://127.0.0.1:11434/v1
AI_COMPATIBLE_MODEL=qwen2.5:3b
AI_COMPATIBLE_API_KEY=
```

5. Install dependencies and start OmniMind:

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## What this removes

- No Gemini API key is needed for ordinary chat generation.
- No Claude/OpenAI hosted LLM key is needed.
- Chat requests go to the local Ollama model by default.
- Chat history, system instructions, and persona context are sent to the local model.

## Important limits

- This changes the **chat generation path**, not every integration in OmniMind. Google Search grounding and some Gemini-specific tool flows are not available in local mode. Google/GitHub OAuth integrations still require their own OAuth setup.
- Vercel serverless cannot connect to Ollama at `127.0.0.1` on your personal device. For a deployed website, run the inference server on a separate machine/server and expose it only through a private, secured connection. Do not publish an unauthenticated Ollama port.
- The model is downloaded separately by Ollama; it is not stored in GitHub.
- The experimental from-scratch Tiny GPT is in `experiments/tiny-gpt`. It is a learning model, not yet capable of replacing Qwen or Claude.

## Switch providers

Set `AI_PROVIDER=local` for the local path. The legacy Gemini route is still present for compatibility if `AI_PROVIDER` is explicitly set to `gemini`, but it is no longer the default.
