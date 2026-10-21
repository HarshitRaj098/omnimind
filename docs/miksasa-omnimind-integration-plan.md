# Miksasa Studio + OmniMind Integration Plan

Status: discovery / design only. No runtime code changed by this document.

## Goals

- Reuse OmniMind's existing chat, memory, connected-app and project-continuity capabilities where appropriate.
- Turn Miksasa Studio into a coding workspace that can generate files, run bounded builds/tests in isolated cloud execution, and show logs/previews.
- Keep the target operating budget at ₹0 by using provider free tiers and available own hardware; disclose quotas, queue delays and availability limits honestly.
- Preserve current OmniMind behavior and keep production deployment unchanged until tests pass.

## Repository discovery

- OmniMind: `HarshitRaj098/omnimind`, TypeScript/Express server in `server.ts`, React/Vite UI under `src/`.
- Existing chat endpoint: `POST /api/chat/stream`; it uses `@google/genai`, supports streaming and tool declarations, and includes Gemini quota cooldown/fallback handling.
- Existing project continuity routes: `GET/POST /api/projects` and related project routes.
- Existing scheduled-task, memory, conversation, GitHub, Google app and research routes should be treated as compatibility-sensitive.
- Current persistence includes JSON files under `data/`; this is not suitable as shared durable storage across multiple ephemeral workers/instances without further design.
- Candidate repository `HarshitRaj098/studio` is a separate Next.js 15 / React 18 Firebase Studio starter branded **JavaSage Offline**. It has Genkit + Google AI flows, but its identity as the deployed Miksasa source has not been established. Do not overwrite or merge it based on its generic repository name.
- The deployed Miksasa prototype was deployed as a small static UI and is not yet linked to a confirmed source repository in the available discovery results. Vercel team-level project inspection also returned a scope authorization error. Confirm source ownership and access before changing deployment configuration.

## Proposed system boundaries

1. **Miksasa Studio frontend**: editor, file tree, diff review, job status, logs and preview.
2. **OmniMind integration API**: authenticated, project-scoped routes; no direct exposure of internal endpoints or provider credentials.
3. **AI provider adapter**: use existing OmniMind Gemini integration first; model/provider configuration, request budgets, cooldowns, backoff, fallback only to genuinely configured/available providers, and usage telemetry.
4. **Execution worker**: separate isolated container per job (or equivalent strong isolation), with strict CPU, memory, disk, duration and output limits; no privileged mode; deny outbound network by default; never run generated shell commands inside the OmniMind web server.
5. **Durable job/persistence layer**: job state with idempotency, leases, retries and resumable logs; persistent project storage/database rather than relying on local JSON files for multi-instance workloads.

## Proposed initial API (new routes; not implemented)

- `POST /api/studio/projects`: create a project/workspace.
- `GET /api/studio/projects/:id`: retrieve project metadata and current revision.
- `POST /api/studio/ai/generate`: create a bounded code-generation request.
- `POST /api/studio/jobs`: enqueue a build/test/run job.
- `GET /api/studio/jobs/:id`: inspect job status, logs and artifact references.
- Optional later: `POST /api/studio/jobs/:id/cancel`, project snapshots, GitHub commit/PR workflow.

All routes must validate schemas, enforce authentication and project ownership, limit payload sizes, and use idempotency keys for job creation. Write actions such as GitHub commits/deployments require explicit review/confirmation.

## Phased implementation

### Phase 0 — baseline and source identity
- Locate the real Miksasa source repository or recreate a clean repository from a reviewed copy of the static prototype.
- Record current production deployment URL, deployment ID, source/commit association and rollback procedure.
- Run existing OmniMind tests/build/typecheck and capture failures before edits.
- Verify the candidate Studio repo identity before any integration.
- Keep this work on a feature branch; do not edit production settings or secrets.

### Phase 1 — narrow integration slice
- Add a dedicated studio route module and typed request/response schemas.
- Connect one authenticated Miksasa project request to the existing OmniMind AI layer.
- Save generated changes as a reviewable file diff; do not execute them automatically.
- Add tests for auth, malformed/oversized input, provider quota exhaustion, provider errors and project isolation.

### Phase 2 — execution
- Introduce a durable job record and a queue/worker interface.
- Run only allow-listed runtime profiles inside isolated containers.
- Return structured status/logs and persist approved artifacts.
- Add cancellation, timeouts, resource caps and abuse protection.

### Phase 3 — reliability and free-tier operation
- Use bounded retry/backoff, per-model cooldowns, request/token budgets, cache eligible repeat requests, and queue jobs when quotas are exhausted.
- Show truthful provider status, remaining local budget where measurable, queue status and cooldowns.
- Do not claim unlimited AI, compute, storage or uptime; provider free-tier quotas and platform limits can change.

### Phase 4 — rollout
- Run current tests, typecheck, build, new API integration tests and worker security tests.
- Deploy a preview first and verify existing chat, memory, scheduled tasks, connected apps, GitHub operations and persistence.
- Promote only after smoke tests pass; retain the last known-good deployment and a documented rollback.

## Acceptance gates

- Existing tests/build pass or pre-existing failures are documented and not worsened.
- No provider secrets in client code, Git history or logs.
- Existing OmniMind routes and user workflows remain compatible.
- Provider quota exhaustion does not trigger retry loops or lose project changes.
- Jobs survive web-process restarts and can be resumed/retrieved.
- Untrusted code runs only in a bounded isolated worker.
- No production deployment is promoted before preview verification.

## Known blockers / decisions

- The actual Miksasa source repository is not confirmed yet.
- Vercel project inspection for the Miksasa deployment is blocked by a team-scope authorization error; reconnect/grant access before changing that project.
- Select the persistent database/queue and cloud worker only after confirming which free-tier services are currently available and their current limits.
- Existing local JSON persistence and scheduled-task process timers need a separate migration plan before scaling to multiple instances.
