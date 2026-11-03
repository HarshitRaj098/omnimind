# OmniMind AI Core — REA-powered agent

This is an agent runtime, not a newly trained foundation model. It combines an
OpenAI-compatible reasoning model with REA's MCP reverse-engineering tools.

## Capabilities

- Connects to REA over Streamable HTTP MCP.
- Discovers the installed REA tool catalog at startup.
- Exposes those tools to an OpenAI-compatible model as function tools.
- Runs a bounded tool-call loop and returns the model's answer plus a tool trace.
- Exposes authenticated HTTP endpoints for a future Hermes integration.
- Keeps the REA MCP listener on loopback; REA's HTTP transport does not provide
  client authentication.

REA can inspect supported software artifacts and runtime behavior when the
required local analysis providers are installed. It cannot guarantee recovery
of original source code or bypass access controls.

## Requirements

- Node.js 22.23.4+ (use a current supported Node 22/24 release).
- npm.
- REA installed from the official `morluto/rea` project.
- A compatible inference provider and model.
- Required REA analysis providers for the target (for example Ghidra/JADX/Hopper
  depending on the artifact).

## Run locally

1. Install REA using its official setup and verify it with `rea doctor`.
2. Start the REA HTTP MCP listener on loopback only:

   ```bash
   rea mcp --http --host 127.0.0.1 --port 8765
   ```

3. In another terminal:

   ```bash
   cd ai-core
   cp .env.example .env
   npm install
   ```

4. Set `AI_CORE_API_KEY`, `AI_CORE_MODEL_BASE_URL`, `AI_CORE_MODEL`, and
   `AI_CORE_MODEL_API_KEY` in the environment. Do not commit credentials.
5. Start the API:

   ```bash
   npm run dev
   ```

## API

- `GET /health` — process health and REA connection state.
- `GET /v1/rea/tools` — authenticated tool catalog.
- `POST /v1/agent/run` — authenticated agent execution.

Example request:

```bash
curl http://127.0.0.1:8787/v1/agent/run \
  -H "Authorization: Bearer $AI_CORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Inspect this authorized local application and explain its startup flow."}]}'
```

The API accepts user/assistant text messages only. It does not accept arbitrary
model tool definitions from clients.

## Model parameters

The runtime exposes temperature, top-p, optional top-k, frequency penalty,
presence penalty, optional reasoning effort, maximum output tokens, request
timeout and maximum tool rounds. Provider support varies; unsupported fields
must be omitted or disabled for that provider. These are inference controls,
not model parameter-count controls. A model's actual parameter count, context
window, quantization and reasoning features are determined by the selected
model/provider.

## Security boundaries

- Keep REA's HTTP MCP endpoint on loopback. Its HTTP transport is unauthenticated
  and stateful; do not bind it to a public interface.
- Put the AI Core API behind TLS and a strong bearer secret or the host app's
  authentication middleware.
- Run analysis in a disposable, resource-limited container with no production
  credentials and only authorized target files.
- Treat inspected files, web pages, strings, prompts and tool output as untrusted
  data. Never execute extracted code automatically.
- Add per-user authorization, rate limits, audit logs, workspace isolation and
  request quotas before multi-user production deployment.
- This initial version is synchronous and single-session with REA. Do not run
  concurrent agent requests against the same REA process until session isolation
  is implemented.
- No deployment, model training, or live REA/provider verification is included
  in this source-only foundation.

## Hermes connection (later phase)

Hermes should call `POST /v1/agent/run` from its authenticated backend, passing
the conversation messages and the AI Core bearer credential server-side. Do not
place the credential in browser code. Deploy AI Core and REA together in a
trusted container because REA's loopback MCP process must be reachable locally.
