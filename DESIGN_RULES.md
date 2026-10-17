# DESIGN_RULES.md — Custom Component System & Design Standards

## 1. Visual Identity & Design Philosophy
OmniMind AI follows a restrained, Claude-inspired design constitution:
- **Surfaces & Neutrals**: Warm off-white canvas in light mode (`#FAF9F6`), quiet dark slate in dark mode (`#0D0D10`).
- **Typography**: High-legibility sans-serif with strict hierarchy and charcoal tones (`#23221E` light / `#F5F5F7` dark). Tabular numerals for metadata and timestamps.
- **Accent Discipline**: Restrained terracotta accent (`#C66A45` / hover `#B55C37`) reserved strictly for primary actions, active tabs, and deliberate focus points.
- **Zero-Pill & Metadata Discipline**: Never wrap informational labels, categories, dates, or statuses in rounded pill capsules or candy badges. Render metadata as clean, unboxed text with subtle typographic separators (`·`).
- **Anti-AI-Slop Restraint**: Absolutely prohibit decorative glowing orbs, pulsating status dots, multi-colored icon scatter, and fake telemetry scoreboards.

## 2. Standardized Component System (`src/components/ui/`)
All screens and dialogs must strictly use the unified component library:
- **`Button`**:
  - `variant`: `primary` (terracotta), `secondary` (subtle border), `quiet` (borderless hover tint), `danger` (subtle rose).
  - `size`: `sm` (h-7, 28px), `md` (h-8.5, 34px), `lg` (h-10, 40px).
  - Consistent padding ($2\times$ horizontal ratio) and unified `AppIcon` alignment.
- **`Modal`**:
  - Semantic surface background (`var(--claude-surface)`), hairline border (`var(--claude-border)`).
  - Standardized header with title, subtitle, icon container, and escape-key dismissal.
  - Standardized body padding (`p-6`) and optional footer action bar.
- **`Input` / `Textarea`**:
  - Consistent border radii (`rounded-xl`), subtle focus rings (`focus:border-[var(--claude-accent)]`).
- **`Tabs`**:
  - Accessible segmented controls and border-bottom tab headers adhering to zero-pill guidelines.
- **`StatusText`**:
  - Unboxed status indicators with subtle semantic dot (`active`, `pending`, `inactive`, `error`).
- **`AppIcon`**:
  - Unified bespoke SVG icon family with consistent `1.6` stroke width, eliminating oversized or mismatched third-party icons.

## 3. Phased Implementation Plan

### Phase 1: Component System & Visual Cohesion Foundation (First Release Boundary)
- [x] Standardize global CSS design tokens in `src/index.css` (warm Claude neutrals, charcoal typography, terracotta accents).
- [x] Create reusable UI primitives in `src/components/ui/` (`Button`, `Modal`, `Input`, `Tabs`, `StatusText`).
- [x] Unify icon family in `AppIcon.tsx` with consistent 1.6 stroke weight.
- [x] Refactor all modals onto unified `Modal` component (`SettingsModal`, `ConnectedAppsModal`, `ResearchWorkspaceModal`, `SkillsWorkspaceModal`, `MemoryWorkspaceModal`, `VoiceModeModal`, `ShareModal`).
- [x] Align `ChatArea`, `Sidebar`, `MessageInput`, and `SharedConversationView` to standard control heights, typography, and zero-pill metadata.
- [x] Remove decorative pulses, glowing orbs, and rainbow icon accents.

### Phase 2: Adaptive Interface Intelligence & Search Integration
- [ ] Task-aware adaptive layouts (conversational view, split document editor, research dual-pane).
- [ ] Unified multi-mode search drawer (Google Search web grounding, chat history search, memory query).
- [ ] Interactive source inspector without layout shifts.

### Phase 3: Real-Time Audio & Low-Latency Voice Streaming
- [ ] Live WebSocket audio streaming via Gemini Live API.
- [ ] Bidirectional voice pipeline with conversational interruption.
- [ ] Restrained voice visualizer communicating real audio states.

### Phase 4: Autonomous Tool Orchestration & Multi-App Execution
- [ ] Multi-app tool workflows across Google Workspace, YouTube Data, and WhatsApp Cloud.
- [ ] Explicit user confirmation safeguards for external destructive actions.
- [ ] Automated skill discovery and progressive tool activation.

## 4. Definition of First Release Boundary
The First Release Boundary represents the minimum bar for visual integrity and architectural stability:
1. **Zero Style Fragmentation**: No component may use hardcoded raw colors (`zinc-900`, `blue-600`, etc.) when semantic CSS variables exist.
2. **Zero Dead Clicks**: All buttons and shortcuts must trigger working modals, actions, or API calls.
3. **Responsive Stability**: Flawless layout on desktop (1440px) and mobile (<768px) with no horizontal overflow.
4. **Clean Persona & Memory**: Dragon Queen persona active by default with reliable cross-session memory recall.
5. **Zero Linter or Build Errors**: Codebase compiles cleanly via Vite and Node TypeScript.
