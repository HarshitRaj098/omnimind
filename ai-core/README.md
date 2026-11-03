# OmniMind AI Core — REA-powered agent

This is an agent runtime, not a newly trained foundation model. It combines an
OpenAI-compatible reasoning model with REA's MCP reverse-engineering tools.

## Capabilities

- Launches the official REA CLI as a child process over stdio MCP.
- Discovers the REA tool catalog at startup.
- Exposes those tools to an OpenAI-compatible model as function tools.
- Runs a bounded tool-call loop and returns the model's answer plus a tool trace.
- Exposes authenticated HTTP endpoints for a future Hermes/OmniMind backend integration.
- Keeps REA local to the AI Core process; no public REA MCP listener is opened.

## Requirements

- Node.js 22.19+ or 24.11+ as required by current REA releases.
- npm.
- REA from the official [morluto/rea project](https://github.com/morluto/rea).
- A compatible inference provider and model.
- Required REA analysis providers for the target (for example Hopper, Ghidra or IDA for deep native analysis).

## Run locally

1. Install and verify REA using its official instructions. For a basic CLI check, run `npx -y rea-agents doctor`.
2. In a terminal, configure the AI Core environment:

   ```bash
   cd ai-core
   cp .env.example .env
   npm install
   ```

3. Set `AI_CORE_API_KEY`, `AI_CORE_MODEL_BASE_URL`, `AI_CORE_MODEL`, and
   `AI_CORE_MODEL_API_KEY` in the environment. Do not commit credentials.
4. The default REA launch command is `npx -y rea-agents mcp`. Override it only
   when your installed REA version requires a different executable or arguments:

   ```bash
   REA_MCP_COMMAND=npx
   REA_MCP_ARGS_JSON='["-y","rea-agents","mcp"]'
   ```

5. Start the API with `npm run dev`.

The AI Core starts REA itself and performs the MCP handshake/tool discovery. Do
not start a second REA MCP server for this integration.

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

- The REA MCP process is launched locally as a child process; do not replace
  this with a public unauthenticated MCP endpoint.
- Put the AI Core API behind TLS and a strong bearer secret or the host app's
  authentication middleware.
- Run analysis in a disposable, resource-limited container with no production
  credentials and only authorized target files.
- Treat inspected files, web pages, strings, prompts and tool output as untrusted
  data. Never execute extracted code automatically.
- Add per-user authorization, rate limits, audit logs, workspace isolation and
  request quotas before multi-user production deployment.
- This initial version is synchronous and single-session with one REA process.
  Do not run concurrent agent requests against the same REA process until
  session isolation is implemented.
- No deployment, model training, or live REA/provider verification is included
  in this source foundation.

## Hermes/OmniMind connection (later phase)

The host backend should call `POST /v1/agent/run` from its authenticated
server-side code, passing conversation messages and the AI Core bearer
credential server-side. Do not place the credential in browser code. Deploy
AI Core and REA together in a trusted container so the local stdio process is
available to the API.
