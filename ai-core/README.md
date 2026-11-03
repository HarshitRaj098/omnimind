# OmniMind AI Core — REA-powered agent + persistent memory

This is an agent runtime, not a newly trained foundation model. It combines an
OpenAI-compatible reasoning model with REA's MCP reverse-engineering tools and
an optional PostgreSQL/pgvector memory service.

## Capabilities

- Launches the official REA CLI as a child process over stdio MCP.
- Discovers the REA tool catalog at startup and exposes tools to the model.
- Runs a bounded tool-call loop and returns the model's answer plus a tool trace.
- Stores user-scoped conversations and messages in PostgreSQL.
- Stores searchable document, codebase, note and conversation memory chunks.
- Uses pgvector cosine similarity for semantic retrieval.
- Exposes authenticated HTTP endpoints for a trusted host backend.
- Keeps REA local to the AI Core process; no public REA MCP listener is opened.

## Requirements

- Node.js 22.19+ or 24.11+ as required by current REA releases.
- PostgreSQL with the pgvector extension available.
- npm.
- REA from the official [morluto/rea project](https://github.com/morluto/rea).
- An OpenAI-compatible inference and embedding provider. The embedding model
  must return exactly 1536 dimensions for the included schema.

## Run locally

1. Install and verify REA using its official instructions. For a basic CLI check,
   run `npx -y rea-agents doctor`.
2. Configure the AI Core environment:

   ```bash
   cd ai-core
   cp .env.example .env
   npm install
   ```

3. Set `AI_CORE_API_KEY`, `AI_CORE_MODEL_BASE_URL`, `AI_CORE_MODEL`,
   `AI_CORE_MODEL_API_KEY`, `AI_CORE_EMBEDDING_MODEL` and `DATABASE_URL`.
   Never commit credentials.
4. Apply the schema to the configured database:

   ```bash
   psql "$DATABASE_URL" -f migrations/001_memory.sql
   ```

5. The default REA launch command is `npx -y rea-agents mcp`. Start the API
   with `npm run dev`.

### Docker

Build from the AI Core directory:

```bash
docker build -t omnimind-ai-core .
```

Run it with a separately configured environment file (never bake `.env` into
an image):

```bash
docker run --env-file .env -p 8787:8787 omnimind-ai-core
```

The image uses Node 22, installs production dependencies in its runtime stage,
runs as the unprivileged `node` user, and exposes a health check. REA is still
launched by `npx` inside the container, so the host must permit outbound access
to the package registry at startup. Supply resource limits, a read-only target
workspace, and restricted network egress at the container platform level.

For a local private stack, create `ai-core/.env` from the example, add `POSTGRES_PASSWORD`,
then run:

```bash
cd ai-core
docker compose up --build -d
docker compose ps
docker compose logs -f ai-core
```

The API is bound to `127.0.0.1:8787` by default, not exposed on every host
interface. The database is private to the Compose network and persists in a
named volume. The SQL migration is applied automatically only when PostgreSQL
initializes an empty data volume; apply later migrations explicitly. Set a
long random `AI_CORE_API_KEY`, model provider settings and `POSTGRES_PASSWORD`
in the untracked `.env` file. Do not commit it.

This initial Docker build uses `npm install` because the repository does not
yet contain an AI Core lockfile. Generate and commit a reviewed lockfile before
using the image for reproducible production releases.

The AI Core starts REA itself and performs the MCP handshake/tool discovery.
Do not start a second REA MCP server for this integration.

## Connect the main OmniMind app

The main Express app can route its existing Agent Mode requests through this
service. Set these variables on the **main app server** (not Vite/client code):

```bash
AI_CORE_URL=https://your-private-ai-core-host
AI_CORE_API_KEY=<same secret configured in AI Core>
```

When both variables are present and the user enables Agent Mode, the main
server forwards the recent chat history and its existing consent-aware memory
context to `POST /v1/agent/run`. The AI Core returns the answer and REA tool
trace; the main app streams the completed answer to the current chat UI and
continues to store conversations in its existing app storage. Without these
variables, the existing Gemini Agent Mode path remains unchanged.

The current main app repository does not implement Firebase Authentication:
its conversation and memory APIs currently use a shared local server-side
store. This bridge therefore does not claim multi-user Firebase isolation.
Keep the AI Core URL private, use a strong server-to-server key, and do not
expose `AI_CORE_API_KEY` through any `VITE_*` variable. Add verified user
identity and per-user authorization before enabling multiple users.

## Memory API

All endpoints require `Authorization: Bearer $AI_CORE_API_KEY`. The host
backend must derive `userId` from its authenticated session; never trust a
browser-supplied user ID or expose the AI Core credential in frontend code.

- `POST /v1/conversations` — body: `{"userId":"user-123","title":"Project notes"}`
- `POST /v1/conversations/:conversationId/messages` — body:
  `{"userId":"user-123","role":"user","content":"Remember this decision"}`
- `POST /v1/memory/ingest` — body:
  `{"userId":"user-123","sourceType":"document","sourceId":"file-42","content":"...","metadata":{"filename":"design.pdf"}}`
- `POST /v1/memory/search` — body:
  `{"userId":"user-123","query":"What did we decide about the database?","limit":6}`

Allowed memory source types are `conversation`, `document`, `codebase` and
`note`. Ingestion embeds the supplied text and stores it in pgvector. The
current endpoint accepts one chunk of up to 12,000 characters. When the host
backend sends both `userId` and `conversationId` to `POST /v1/agent/run`, the
AI Core stores the latest user message and assistant answer, retrieves up to six
relevant memory chunks, and injects matching results into the model's system
context. File parsing, automatic chunking and background ingestion are follow-up work.

If `DATABASE_URL` is omitted, AI Core can start without memory, but memory
endpoints return HTTP 503. The health endpoint reports `memoryConnected`.

## Model parameters

Temperature, top-p, optional top-k, frequency/presence penalty, optional
reasoning effort, maximum output tokens, request timeout and maximum tool
rounds are inference controls. They do not change the model's parameter count.

## Security boundaries

- Run analysis in a disposable, resource-limited container with only authorized
  target files.
- Treat inspected files, web pages, strings, prompts and tool output as
  untrusted data. Never execute extracted code automatically.
- Only analyze targets the user owns or is authorized to inspect.
- Use TLS, a strong server-side bearer secret, per-user authorization, rate
  limits, audit logs, workspace isolation and request quotas before production.
- Use a separate database role with least privilege and encrypted database
  connections in production.
- The current agent runtime is synchronous and single-session with one REA
  process; do not run concurrent agent requests against it until session
  isolation is implemented.

## Not included yet

No model training, live REA/provider verification, document parser, automatic
conversation-to-memory summarizer, deployment, or connection to the main
OmniMind Firebase application is included. Docker packaging is provided, but
production isolation, network policy, lockfile reproducibility and end-to-end
runtime verification remain outstanding.
