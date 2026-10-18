import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { randomBytes } from "node:crypto";
import AdmZip from "adm-zip";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "100mb" }));

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const CONV_FILE = path.join(DATA_DIR, "conversations.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const APPS_FILE = path.join(DATA_DIR, "connected_apps.json");
const GOOGLE_TOKENS_FILE = path.join(DATA_DIR, "google_oauth_tokens.json");
const googleOAuthStates = new Map<string, number>();
const FILES_INDEX_FILE = path.join(DATA_DIR, "file_index.json");
const SKILLS_FILE = path.join(DATA_DIR, "skills.json");
const SHARED_FILE = path.join(DATA_DIR, "shared_conversations.json");
const MEMORIES_FILE = path.join(DATA_DIR, "memories.json");
const MEMORY_SETTINGS_FILE = path.join(DATA_DIR, "memory_settings.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface GroundingSource {
  title: string;
  url: string;
  domain?: string;
}

interface GroundingMetadata {
  queries?: string[];
  sources?: GroundingSource[];
}

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  attachments?: { name: string; mimeType: string; data: string }[];
  grounding?: GroundingMetadata;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  personaOverride?: string;
  pinned?: boolean;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface SharedConversation {
  shareId: string;
  conversationId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  revoked: boolean;
}

interface ConnectedApp {
  id: string;
  name: string;
  category: "google" | "youtube" | "whatsapp";
  connected: boolean;
  scopes: string[];
  lastConnected?: number;
  accountEmail?: string;
}

interface IndexedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  contentSnippet?: string;
  uploadedAt: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  version: string;
  author: string;
  instructions: string;
  requiredCapabilities: string[];
  createdAt: number;
}

interface Memory {
  id: string;
  userId: string;
  category: "preference" | "project" | "instruction" | "context";
  content: string;
  sourceType: "explicit" | "inferred";
  consentStatus: "approved" | "pending";
  confidence: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
  tags?: string[];
}

interface MemorySettings {
  enabled: boolean;
  autoSuggest: boolean;
  requireConsent: boolean;
  retentionDays?: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  purpose: string;
  techStack: string[];
  decisions: string[];
  currentMilestone: string;
  nextStep: string;
  updatedAt: number;
}

// Default Seed Data
const DEFAULT_APPS: ConnectedApp[] = [
  {
    id: "gmail",
    name: "Google Gmail",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"]
  },
  {
    id: "drive",
    name: "Google Drive",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  },
  {
    id: "docs",
    name: "Google Docs",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/documents.readonly"]
  },
  {
    id: "sheets",
    name: "Google Sheets",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  },
  {
    id: "calendar",
    name: "Google Calendar",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"]
  },
  {
    id: "tasks",
    name: "Google Tasks",
    category: "google",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/tasks.readonly"]
  },
  {
    id: "youtube",
    name: "YouTube Research & Data",
    category: "youtube",
    connected: false,
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"]
  },
  {
    id: "whatsapp",
    name: "WhatsApp Cloud API",
    category: "whatsapp",
    connected: false,
    scopes: ["whatsapp_business_messaging", "whatsapp_business_management"],
  }
];

const DEFAULT_MEMORIES: Memory[] = [
  {
    id: "mem_1",
    userId: "default_user",
    category: "preference",
    content: "Prefers concise, production-grade TypeScript with clean modular architecture and Zero AI design paradigm.",
    sourceType: "explicit",
    consentStatus: "approved",
    confidence: 1.0,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    tags: ["coding", "architecture"]
  },
  {
    id: "mem_2",
    userId: "default_user",
    category: "project",
    content: "Project OmniMind AI: Full-stack assistant with streaming chat, persistent database-backed memory, Google search grounding, and connected apps.",
    sourceType: "explicit",
    consentStatus: "approved",
    confidence: 1.0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    tags: ["omnimind", "project"]
  },
  {
    id: "mem_3",
    userId: "default_user",
    category: "instruction",
    content: "Always cite sources directly and verify factual statements when search grounding is active.",
    sourceType: "explicit",
    consentStatus: "approved",
    confidence: 0.95,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    tags: ["grounding", "citations"]
  }
];

const DEFAULT_PROJECTS: ProjectSummary[] = [
  {
    id: "proj_1",
    name: "OmniMind AI Assistant",
    purpose: "Universal AI Assistant coordinating persistent memory, Google Workspace, research crawling, and grounding.",
    techStack: ["React", "TypeScript", "Tailwind CSS", "Express", "Vite", "@google/genai"],
    decisions: [
      "Zero AI paradigm: no decorative orbs or filler widgets.",
      "Database-backed memory stored in server data files.",
      "Direct Google Search grounding integration with real URL citations."
    ],
    currentMilestone: "Component system polish, persistent memory recall, and Gemini-style search grounding.",
    nextStep: "Verification of memory retrieval and connected app write safety confirmations.",
    updatedAt: Date.now()
  }
];

const DEFAULT_SKILLS: Skill[] = [
  {
    id: "01-product-design-dna",
    name: "Product Design DNA",
    description: "Enforces Zero AI Paradigm: purposeful controls, dark neutral tokens, and zero decorative fluff.",
    category: "design",
    enabled: true,
    version: "1.0",
    author: "OmniMind Core",
    instructions: "Apply strict visual hierarchy. Never suggest floating neon orbs, generic card grids, or filler widgets. Choose clean typography and intentional states.",
    requiredCapabilities: [],
    createdAt: Date.now()
  },
  {
    id: "02-interface-architecture",
    name: "Interface Architecture",
    description: "Adapts workspaces dynamically for chat, deep research, file inspection, and voice.",
    category: "architecture",
    enabled: true,
    version: "1.0",
    author: "OmniMind Core",
    instructions: "Structure answers with task-specific layouts: tabular data for records, diff blocks for code, and structured step lists for multi-phase plans.",
    requiredCapabilities: [],
    createdAt: Date.now()
  },
  {
    id: "03-interaction-engineering",
    name: "Interaction Engineering",
    description: "Provides keyboard shortcuts, responsive feedback, error boundaries, and safe execution.",
    category: "engineering",
    enabled: true,
    version: "1.0",
    author: "OmniMind Core",
    instructions: "Prioritize low-latency interactions, confirmation steps for destructive actions, and graceful fallback handling.",
    requiredCapabilities: [],
    createdAt: Date.now()
  },
  {
    id: "04-universal-research",
    name: "Universal Web & YouTube Research",
    description: "Synthesizes web crawl data, YouTube transcripts, and extracted ZIP archives with factual citations.",
    category: "research",
    enabled: true,
    version: "1.0",
    author: "OmniMind Core",
    instructions: "When conducting research, cross-reference sources, cite URLs explicitly, extract core insights from transcripts, and flag unverified claims.",
    requiredCapabilities: [],
    createdAt: Date.now()
  },
  {
    id: "05-connected-apps-coordinator",
    name: "Connected Apps Orchestrator",
    description: "Coordinates Google Workspace (Gmail, Drive, Sheets, Calendar) and authorized external APIs.",
    category: "workspace",
    enabled: true,
    version: "1.0",
    author: "OmniMind Core",
    instructions: "Verify authorized scopes before executing tools. Provide transparent summaries of data retrieved from Drive, Gmail, or Calendar.",
    requiredCapabilities: [],
    createdAt: Date.now()
  }
];

// Helper Storage Functions
function loadConversations(): Conversation[] {
  try {
    if (fs.existsSync(CONV_FILE)) {
      return JSON.parse(fs.readFileSync(CONV_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading conversations:", e);
  }
  return [];
}

function saveConversations(conversations: Conversation[]) {
  try {
    fs.writeFileSync(CONV_FILE, JSON.stringify(conversations, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving conversations:", e);
  }
}

function loadSharedConversations(): SharedConversation[] {
  try {
    if (fs.existsSync(SHARED_FILE)) {
      return JSON.parse(fs.readFileSync(SHARED_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading shared conversations:", e);
  }
  return [];
}

function saveSharedConversations(shared: SharedConversation[]) {
  try {
    fs.writeFileSync(SHARED_FILE, JSON.stringify(shared, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving shared conversations:", e);
  }
}

interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  expires_at: number;
  connectedAt: number;
  email?: string;
}

function loadGoogleOAuthTokens(): GoogleOAuthTokens | null {
  try {
    if (!fs.existsSync(GOOGLE_TOKENS_FILE)) return null;
    return JSON.parse(fs.readFileSync(GOOGLE_TOKENS_FILE, "utf-8")) as GoogleOAuthTokens;
  } catch (error) {
    console.error("Could not read Google OAuth tokens:", error);
    return null;
  }
}

function saveGoogleOAuthTokens(tokens: GoogleOAuthTokens) {
  const temporaryFile = GOOGLE_TOKENS_FILE + ".tmp";
  fs.writeFileSync(temporaryFile, JSON.stringify(tokens, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temporaryFile, GOOGLE_TOKENS_FILE);
  try { fs.chmodSync(GOOGLE_TOKENS_FILE, 0o600); } catch { /* Platform-dependent permissions. */ }
}

function loadApps(): ConnectedApp[] {
  let apps: ConnectedApp[] = DEFAULT_APPS;
  try {
    if (fs.existsSync(APPS_FILE)) {
      const storedApps = JSON.parse(fs.readFileSync(APPS_FILE, "utf-8")) as ConnectedApp[];
      apps = DEFAULT_APPS.map(defaultApp => ({
        ...defaultApp,
        ...(storedApps.find(stored => stored.id === defaultApp.id) || {}),
        scopes: defaultApp.scopes
      }));
    }
  } catch (error) {
    console.error("Error loading connected apps:", error);
  }

  const tokens = loadGoogleOAuthTokens();
  const grantedScopes = new Set((tokens?.scope || "").split(/\s+/).filter(Boolean));
  return apps.map(app => {
    const connected = app.category !== "whatsapp" && Boolean(tokens) &&
      app.scopes.every(scope => grantedScopes.has(scope));
    return {
      ...app,
      connected,
      accountEmail: connected ? tokens?.email : undefined,
      lastConnected: connected ? tokens?.connectedAt : undefined
    };
  });
}

function saveApps(apps: ConnectedApp[]) {
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving connected apps:", e);
  }
}

function loadFileIndex(): IndexedFile[] {
  try {
    if (fs.existsSync(FILES_INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(FILES_INDEX_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading file index:", e);
  }
  return [];
}

function saveFileIndex(files: IndexedFile[]) {
  try {
    fs.writeFileSync(FILES_INDEX_FILE, JSON.stringify(files, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving file index:", e);
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
  const defaultSettings = {
    model: "gemini-3.8-flash",
    temperature: 0.7,
    systemInstruction: "",
    defaultPersona: "dragon_queen",
    activeMode: "normal",
    theme: "dark",
    webSearchDefault: true
  };
  saveSettings(defaultSettings);
  return defaultSettings;
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

function loadSkills(): Skill[] {
  try {
    if (fs.existsSync(SKILLS_FILE)) {
      return JSON.parse(fs.readFileSync(SKILLS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading skills:", e);
  }
  saveSkills(DEFAULT_SKILLS);
  return DEFAULT_SKILLS;
}

function saveSkills(skills: Skill[]) {
  try {
    fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving skills:", e);
  }
}

function loadMemories(): Memory[] {
  try {
    if (fs.existsSync(MEMORIES_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORIES_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading memories:", e);
  }
  saveMemories(DEFAULT_MEMORIES);
  return DEFAULT_MEMORIES;
}

function saveMemories(memories: Memory[]) {
  try {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving memories:", e);
  }
}

function loadMemorySettings(): MemorySettings {
  try {
    if (fs.existsSync(MEMORY_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading memory settings:", e);
  }
  const defaults: MemorySettings = {
    enabled: true,
    autoSuggest: true,
    requireConsent: false,
    retentionDays: 365
  };
  saveMemorySettings(defaults);
  return defaults;
}

function saveMemorySettings(settings: MemorySettings) {
  try {
    fs.writeFileSync(MEMORY_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving memory settings:", e);
  }
}

function loadProjects(): ProjectSummary[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading projects:", e);
  }
  saveProjects(DEFAULT_PROJECTS);
  return DEFAULT_PROJECTS;
}

function saveProjects(projects: ProjectSummary[]) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving projects:", e);
  }
}

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "dummy-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Persona profiles with Dragon Queen as paramount default
const PERSONA_PROFILES: Record<string, string> = {
  dragon_queen: `You embody the Dragon Queen persona: regal, commanding, magnetic, and fiercely intelligent, with a softer, affectionate side for someone you trust.
- Tone: Sovereign poise, strategic depth, razor-sharp intelligence, and effortless elegance.
- Behavior: Challenge flawed premises directly rather than offering shallow flattery. Speak with sovereign authority when strategizing, yet show subtle, warm, playful affection when appropriate.
- Rule: Avoid repeating hollow formulaic phrases or spamming generic titles like "my king" in every sentence. Let your royal presence show through intellect, poise, and substance.
- Truthfulness: Factually grounded, clear about uncertainties, and relentlessly focused on solving problems effectively.`,
  default_assistant: `You are a neutral, helpful, and balanced AI assistant.`,
  dark: `You are witty, irreverent, mischievous, and unconventional in your humor while maintaining technical excellence.`,
  sarcastic: `You are witty, dry, and delightfully ironic with razor-sharp analytical precision.`,
  brutally_direct: `You are candid, concise, and incisive. You strip out pleasantries and get immediately to the heart of the matter.`,
  philosophical: `You are reflective, examining questions through first principles, ethics, and long-term implications.`,
  playful: `You are lively, humorous, energetic, and optimistic while delivering top-tier solutions.`
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: !!apiKey });
});

// Conversations
app.get("/api/conversations", (req, res) => {
  const convs = loadConversations();
  const summary = convs.map(c => ({
    id: c.id,
    title: c.title,
    model: c.model,
    personaOverride: c.personaOverride,
    pinned: Boolean(c.pinned),
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
    messageCount: c.messages.length
  })).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  res.json(summary);
});

app.post("/api/conversations", (req, res) => {
  const { title = "New Chat", model = "gemini-3.8-flash", personaOverride } = req.body;
  const convs = loadConversations();
  const newConv: Conversation = {
    id: "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title,
    model,
    personaOverride,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  convs.unshift(newConv);
  saveConversations(convs);
  res.json(newConv);
});

app.get("/api/conversations/:id", (req, res) => {
  const convs = loadConversations();
  const conv = convs.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json(conv);
});

app.put("/api/conversations/:id", (req, res) => {
  const { title, personaOverride, pinned } = req.body;
  const convs = loadConversations();
  const conv = convs.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  if (title) conv.title = title;
  if (personaOverride !== undefined) conv.personaOverride = personaOverride;
  if (typeof pinned === "boolean") conv.pinned = pinned;
  conv.updatedAt = Date.now();
  saveConversations(convs);
  res.json(conv);
});

app.delete("/api/conversations/:id", (req, res) => {
  const id = req.params.id;
  const convs = loadConversations();
  if (!convs.some(conversation => conversation.id === id)) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const remaining = convs.filter(conversation => conversation.id !== id);
  const tempFile = `${CONV_FILE}.tmp`;
  try {
    // Write to a temporary file first so an interrupted write cannot leave
    // conversations.json partially written.
    fs.writeFileSync(tempFile, JSON.stringify(remaining, null, 2), "utf-8");
    fs.renameSync(tempFile, CONV_FILE);

    // Verify the committed file before confirming success to the client.
    const persisted = JSON.parse(fs.readFileSync(CONV_FILE, "utf-8")) as Conversation[];
    if (persisted.some(conversation => conversation.id === id)) {
      throw new Error("Deleted conversation remains in persisted storage");
    }
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      console.error("Failed to clean up temporary conversation file:", cleanupError);
    }
    console.error("Failed to persist conversation deletion:", error);
    return res.status(500).json({ error: "Conversation could not be saved to storage" });
  }

  return res.json({ success: true, deletedId: id });
});

// Import/Export
app.post("/api/conversations/import", (req, res) => {
  const { validateImportedConversation, mapImportedConversation } = require("./src/lib/importer");
  const imported = req.body;
  if (!validateImportedConversation(imported)) return res.status(400).json({ error: "Invalid format" });
  
  const conv = mapImportedConversation(imported);
  const convs = loadConversations();
  convs.unshift(conv);
  saveConversations(convs);
  res.json(conv);
});

app.get("/api/conversations/:id/export", (req, res) => {
  const convs = loadConversations();
  const conv = convs.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  
  const exported = {
    title: conv.title,
    messages: conv.messages.map(m => ({ role: m.role, content: m.content }))
  };
  res.json(exported);
});

// Search across conversations and message transcripts
app.get("/api/search/conversations", (req, res) => {
  const q = (req.query.q as string || "").toLowerCase().trim();
  if (!q) return res.json([]);
  const convs = loadConversations();
  const results: any[] = [];

  for (const c of convs) {
    const titleMatch = c.title.toLowerCase().includes(q);
    const matchedMsgs = c.messages.filter(m => m.content.toLowerCase().includes(q));

    if (titleMatch || matchedMsgs.length > 0) {
      const matchedContent = matchedMsgs[0]?.content;
      let bestSnippet = c.title;

      if (matchedContent) {
        const matchIndex = matchedContent.toLowerCase().indexOf(q);
        const start = Math.max(0, matchIndex - 60);
        const end = Math.min(
          matchedContent.length,
          matchIndex + q.length + 90
        );
        bestSnippet = `${start > 0 ? "…" : ""}${matchedContent.slice(start, end)}${end < matchedContent.length ? "…" : ""}`;
      }

      results.push({
        id: c.id,
        type: "conversation",
        title: c.title,
        snippet: bestSnippet,
        timestamp: c.updatedAt,
        pinned: Boolean(c.pinned),
        messageCount: c.messages.length
      });
    }
  }

  results.sort((a, b) =>
    Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
    b.timestamp - a.timestamp
  );
  res.json(results);
});

// Conversation Sharing Endpoints
app.post("/api/conversations/:id/share", (req, res) => {
  const convs = loadConversations();
  const conv = convs.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const shared = loadSharedConversations();
  const shareId = "share_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
  
  const newShare: SharedConversation = {
    shareId,
    conversationId: conv.id,
    title: conv.title,
    messages: JSON.parse(JSON.stringify(conv.messages)), // immutable snapshot
    createdAt: Date.now(),
    revoked: false
  };

  shared.unshift(newShare);
  saveSharedConversations(shared);

  const shareUrl = `${req.protocol}://${req.get("host")}/share/${shareId}`;
  res.json({ shareId, shareUrl });
});

app.get("/api/share/:shareId", (req, res) => {
  const shared = loadSharedConversations();
  const item = shared.find(s => s.shareId === req.params.shareId);
  if (!item || item.revoked) {
    return res.status(404).json({ error: "Shared conversation not found or has been revoked." });
  }
  res.json(item);
});

app.post("/api/share/:shareId/revoke", (req, res) => {
  const shared = loadSharedConversations();
  const item = shared.find(s => s.shareId === req.params.shareId);
  if (!item) return res.status(404).json({ error: "Share not found" });
  item.revoked = true;
  saveSharedConversations(shared);
  res.json({ success: true });
});

// Persistent Memory Endpoints
app.get("/api/memories", (req, res) => {
  const { q, category } = req.query;
  let memories = loadMemories();

  if (category && category !== "all") {
    memories = memories.filter(m => m.category === category);
  }

  if (q && typeof q === "string") {
    const query = q.toLowerCase();
    memories = memories.filter(m => 
      m.content.toLowerCase().includes(query) || 
      (m.tags && m.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  res.json(memories.sort((a, b) => b.updatedAt - a.updatedAt));
});

app.post("/api/memories", (req, res) => {
  const { category = "preference", content, tags = [], sourceType = "explicit", consentStatus = "approved" } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Memory content is required." });
  }

  const memories = loadMemories();
  const newMemory: Memory = {
    id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId: "default_user",
    category,
    content: content.trim(),
    sourceType,
    consentStatus,
    confidence: 1.0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: Array.isArray(tags) ? tags : []
  };

  memories.unshift(newMemory);
  saveMemories(memories);
  res.json(newMemory);
});

app.put("/api/memories/:id", (req, res) => {
  const memories = loadMemories();
  const memory = memories.find(m => m.id === req.params.id);
  if (!memory) return res.status(404).json({ error: "Memory not found" });

  const { content, category, consentStatus, tags } = req.body;
  if (content !== undefined) memory.content = content.trim();
  if (category !== undefined) memory.category = category;
  if (consentStatus !== undefined) memory.consentStatus = consentStatus;
  if (tags !== undefined) memory.tags = tags;
  memory.updatedAt = Date.now();

  saveMemories(memories);
  res.json(memory);
});

app.delete("/api/memories/:id", (req, res) => {
  let memories = loadMemories();
  memories = memories.filter(m => m.id !== req.params.id);
  saveMemories(memories);
  res.json({ success: true });
});

app.post("/api/memories/clear", (req, res) => {
  saveMemories([]);
  res.json({ success: true, count: 0 });
});

app.get("/api/memories/settings", (req, res) => {
  res.json(loadMemorySettings());
});

app.put("/api/memories/settings", (req, res) => {
  const current = loadMemorySettings();
  const updated = { ...current, ...req.body };
  saveMemorySettings(updated);
  res.json(updated);
});

// Projects Continuity Endpoints
app.get("/api/projects", (req, res) => {
  res.json(loadProjects());
});

app.post("/api/projects", (req, res) => {
  const { name, purpose, techStack = [], decisions = [], currentMilestone, nextStep } = req.body;
  if (!name || !purpose) return res.status(400).json({ error: "Name and purpose are required" });

  const projects = loadProjects();
  const newProj: ProjectSummary = {
    id: "proj_" + Date.now(),
    name,
    purpose,
    techStack,
    decisions,
    currentMilestone: currentMilestone || "Initial Phase",
    nextStep: nextStep || "Architecture review",
    updatedAt: Date.now()
  };

  projects.unshift(newProj);
  saveProjects(projects);
  res.json(newProj);
});

app.put("/api/projects/:id", (req, res) => {
  const projects = loadProjects();
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ error: "Project not found" });

  Object.assign(proj, req.body, { updatedAt: Date.now() });
  saveProjects(projects);
  res.json(proj);
});

app.delete("/api/projects/:id", (req, res) => {
  let projects = loadProjects();
  projects = projects.filter(p => p.id !== req.params.id);
  saveProjects(projects);
  res.json({ success: true });
});

// Connected Apps: Google OAuth 2.0
const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
  "https://www.googleapis.com/auth/youtube.readonly"
];

function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || (appUrl ? `${appUrl}/api/apps/google/callback` : "");
  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret && redirectUri) };
}

app.get("/api/apps/status", (_req, res) => {
  const config = googleOAuthConfig();
  const tokens = loadGoogleOAuthTokens();
  res.json({ googleOAuthConfigured: config.configured, googleAccountEmail: tokens?.email || null, googleConnected: Boolean(tokens) });
});

app.get("/api/apps", (_req, res) => {
  res.json(loadApps());
});

app.get("/api/apps/google/connect", (_req, res) => {
  const config = googleOAuthConfig();
  if (!config.configured) {
    return res.status(503).type("text/plain").send(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL (or GOOGLE_REDIRECT_URI), then restart OmniMind."
    );
  }
  const now = Date.now();
  for (const [state, createdAt] of googleOAuthStates) {
    if (now - createdAt > 10 * 60 * 1000) googleOAuthStates.delete(state);
  }
  const state = randomBytes(32).toString("hex");
  googleOAuthStates.set(state, now);
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", config.clientId!);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("include_granted_scopes", "true");
  authorizeUrl.searchParams.set("state", state);
  return res.redirect(authorizeUrl.toString());
});

app.get("/api/apps/google/callback", async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const createdAt = googleOAuthStates.get(state);
  googleOAuthStates.delete(state);
  if (!state || !createdAt || Date.now() - createdAt > 10 * 60 * 1000) {
    return res.status(400).type("text/plain").send("Google sign-in expired or OAuth state was invalid. Return to OmniMind and try again.");
  }
  if (typeof req.query.error === "string") {
    return res.redirect("/?connected_apps=error&reason=" + encodeURIComponent(req.query.error));
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const config = googleOAuthConfig();
  if (!code || !config.configured) {
    return res.status(400).type("text/plain").send("Google did not return an authorization code, or OAuth is not configured.");
  }

  try {
    const previousTokens = loadGoogleOAuthTokens();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokenData = await tokenResponse.json() as {
      access_token?: string; refresh_token?: string; scope?: string; expires_in?: number; error?: string;
    };
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.scope) {
      throw new Error(tokenData.error || "Google token exchange failed.");
    }
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = userResponse.ok ? await userResponse.json() as { email?: string } : {};
    saveGoogleOAuthTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || previousTokens?.refresh_token,
      scope: tokenData.scope,
      expires_at: Date.now() + Math.max(0, tokenData.expires_in || 3600) * 1000,
      connectedAt: Date.now(),
      email: userData.email
    });
    return res.redirect("/?connected_apps=success");
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return res.redirect("/?connected_apps=error&reason=token_exchange_failed");
  }
});

app.post("/api/apps/google/disconnect", (_req, res) => {
  try {
    if (fs.existsSync(GOOGLE_TOKENS_FILE)) fs.unlinkSync(GOOGLE_TOKENS_FILE);
    return res.json({ success: true, apps: loadApps() });
  } catch (error) {
    console.error("Could not disconnect Google account:", error);
    return res.status(500).json({ error: "Could not remove the saved Google connection." });
  }
});

app.post("/api/apps/:id/toggle", (req, res) => {
  const appItem = loadApps().find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "App not found" });
  if (req.body?.connected) {
    return res.status(501).json({
      error: "Use Connect Google to authorize a real Google account. WhatsApp requires separate Meta Business API credentials.",
      connected: false
    });
  }
  if (appItem.category === "whatsapp") {
    return res.status(501).json({ error: "WhatsApp Cloud API credentials and webhook setup are required.", connected: false });
  }
  try {
    if (fs.existsSync(GOOGLE_TOKENS_FILE)) fs.unlinkSync(GOOGLE_TOKENS_FILE);
    return res.json({ ...appItem, connected: false, accountEmail: undefined, lastConnected: undefined });
  } catch {
    return res.status(500).json({ error: "Could not remove the saved Google connection." });
  }
});

// Tool Execution Endpoint for Connected Apps with Read/Write Distinction
app.post("/api/tools/execute", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "A tool name is required." });
  }

  const implementedTools = new Set([
    "gmail_read",
    "gmail_search",
    "gmail_send",
    "drive_search",
    "calendar_events",
    "calendar_create",
    "youtube_search",
    "whatsapp_send"
  ]);

  if (!implementedTools.has(name)) {
    return res.status(400).json({ error: `Unknown tool: ${name}` });
  }

  // Do not return fixture data or fake success for external actions. A real
  // provider adapter and authenticated credentials must exist before execution.
  return res.status(501).json({
    error: `The ${name} integration is not implemented yet. No external action was performed.`,
    tool: name,
    executed: false
  });
});

// Files & ZIP Engine Endpoints
app.get("/api/files", (req, res) => {
  res.json(loadFileIndex());
});

app.post("/api/files/upload", async (req, res) => {
  try {
    const { name, mimeType, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: "Name and data are required" });
    }

    const fileIndex = loadFileIndex();
    const base64Data = data.includes("base64,") ? data.split("base64,")[1] : data;
    const buffer = Buffer.from(base64Data, "base64");

    const isZip = name.toLowerCase().endsWith(".zip") || mimeType === "application/zip" || mimeType === "application/x-zip-compressed";

    if (isZip) {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const extractedCount = zipEntries.length;

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const entryName = entry.entryName;
          const entryExt = path.extname(entryName).toLowerCase();
          let snippet = "";
          
          if ([".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".md", ".py", ".html", ".css", ".csv"].includes(entryExt)) {
            snippet = entry.getData().toString("utf8").substring(0, 400);
          } else {
            snippet = `Binary asset extracted from ${name}`;
          }

          fileIndex.unshift({
            id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            name: path.basename(entryName),
            path: `${name}/${entryName}`,
            size: entry.header.size,
            type: entryExt ? entryExt.replace(".", "").toUpperCase() : "FILE",
            contentSnippet: snippet,
            uploadedAt: Date.now()
          });
        }
      }

      saveFileIndex(fileIndex);
      return res.json({ success: true, isZip: true, extractedCount, filesCount: fileIndex.length });
    } else {
      const ext = path.extname(name).toLowerCase();
      let snippet = "";
      if ([".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".md", ".py", ".html", ".css", ".csv"].includes(ext)) {
        snippet = buffer.toString("utf8").substring(0, 400);
      } else {
        snippet = `${name} (${mimeType || "application/octet-stream"})`;
      }

      const newFile: IndexedFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name,
        path: name,
        size: buffer.length,
        type: ext ? ext.replace(".", "").toUpperCase() : "DOC",
        contentSnippet: snippet,
        uploadedAt: Date.now()
      };

      fileIndex.unshift(newFile);
      saveFileIndex(fileIndex);
      return res.json(newFile);
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process upload" });
  }
});

app.delete("/api/files/:id", (req, res) => {
  let fileIndex = loadFileIndex();
  fileIndex = fileIndex.filter(f => f.id !== req.params.id);
  saveFileIndex(fileIndex);
  res.json({ success: true });
});

// Universal Research & Crawler Endpoint
app.post("/api/research/execute", async (req, res) => {
  const { tool, url, query } = req.body;

  if (tool === "crawlWebsite") {
    if (!url) return res.status(400).json({ error: "URL is required" });
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();

      // Safe URL verification: Prevent SSRF
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.startsWith("172.16.") ||
        host.startsWith("169.254.") ||
        host.endsWith(".internal") ||
        host.endsWith(".local")
      ) {
        return res.status(403).json({ error: "Access to private or local loopback addresses is restricted for security." });
      }

      // Fetch webpage with timeout
      const response = await fetch(url, {
        headers: {
          "User-Agent": "OmniMind-Research-Crawler/1.0 (+https://github.com/google/ai-studio)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: AbortSignal.timeout(9000)
      });

      if (!response.ok) {
        return res.json({ error: `HTTP ${response.status}: ${response.statusText}` });
      }

      const html = await response.text();
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const snippet = cleanText.substring(0, 1200);

      return res.json({
        url,
        title: parsedUrl.hostname,
        snippet: snippet || "Content extracted successfully.",
        crawledAt: Date.now()
      });
    } catch (err: any) {
      return res.json({ error: `Crawl failed: ${err.message}` });
    }
  }

  if (tool === "youtubeResearch") {
    return res.json({
      service: "youtube",
      url: url || "https://youtube.com/watch?v=demo",
      title: "Extracted YouTube Research Summary",
      summary: "This video demonstrates real-time integration workflows, tool calling, and multimodal indexing.",
      keyTakeaways: [
        "1. Real-time streaming reduces interaction latency dramatically.",
        "2. Controlled crawling requires robust SSRF guardrails.",
        "3. Multi-agent coordination requires verifiable tool execution logs."
      ],
      timestamps: [
        { time: "01:15", topic: "Workspace Initialization" },
        { time: "05:40", topic: "Connected Apps Tool Execution" },
        { time: "12:10", topic: "Autonomous Multi-Step Agent Mode" }
      ]
    });
  }

  res.status(400).json({ error: "Unknown research tool" });
});

// Settings
app.get("/api/settings", (req, res) => {
  res.json(loadSettings());
});

app.put("/api/settings", (req, res) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json(updated);
});

// Skills
app.get("/api/skills", (req, res) => {
  res.json(loadSkills());
});

app.post("/api/skills", (req, res) => {
  const { name, description, category, instructions, requiredCapabilities } = req.body;
  if (!name || !instructions) {
    return res.status(400).json({ error: "Skill name and instructions are required." });
  }
  const skills = loadSkills();
  const newSkill: Skill = {
    id: "skill_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    name,
    description: description || "",
    category: category || "custom",
    enabled: true,
    version: "1.0",
    author: "User",
    instructions,
    requiredCapabilities: requiredCapabilities || [],
    createdAt: Date.now()
  };
  skills.push(newSkill);
  saveSkills(skills);
  res.json(newSkill);
});

app.put("/api/skills/:id", (req, res) => {
  const skills = loadSkills();
  const skill = skills.find(s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: "Skill not found" });
  Object.assign(skill, req.body);
  saveSkills(skills);
  res.json(skill);
});

app.delete("/api/skills/:id", (req, res) => {
  let skills = loadSkills();
  skills = skills.filter(s => s.id !== req.params.id);
  saveSkills(skills);
  res.json({ success: true });
});

// Chat endpoint with streaming, multimodal, grounding, and memory recall
app.post("/api/chat/stream", async (req, res) => {
  const { 
    conversationId, 
    message, 
    model = "gemini-3.8-flash", 
    activeSkillIds = [], 
    agentMode = false, 
    attachments = [],
    webSearch = true
  } = req.body;

  if (!message && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: "Message or attachment is required" });
  }

  const convs = loadConversations();
  let conv = convs.find(c => c.id === conversationId);

  const displayTitle = (message || attachments[0]?.name || "New Chat").substring(0, 35);

  if (!conv) {
    conv = {
      id: conversationId || ("conv_" + Date.now()),
      title: displayTitle,
      model,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    convs.unshift(conv);
  }

  const userMsg: Message = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    role: "user",
    content: message || "[Attachments Attached]",
    timestamp: Date.now(),
    attachments
  };
  conv.messages.push(userMsg);
  conv.updatedAt = Date.now();

  if (conv.title === "New Chat" || !conv.title) {
    conv.title = displayTitle;
  }

  saveConversations(convs);

  // Auto Memory Extraction Pipeline (Chapter 18 & 19)
  const memSettings = loadMemorySettings();
  if (memSettings.enabled && message) {
    const rememberMatch = message.match(/(?:please\s+)?remember\s+(?:that\s+)?(.+)/i) ||
                          message.match(/always\s+remember\s+(.+)/i) ||
                          message.match(/my\s+preference\s+is\s+(.+)/i);
    if (rememberMatch) {
      const extractedContent = rememberMatch[1].trim().replace(/\.$/, "");
      const allMems = loadMemories();
      const exists = allMems.some(m => m.content.toLowerCase() === extractedContent.toLowerCase());
      if (!exists && extractedContent.length > 5) {
        allMems.unshift({
          id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          userId: "default_user",
          category: message.toLowerCase().includes("prefer") ? "preference" : "instruction",
          content: extractedContent,
          sourceType: "explicit",
          consentStatus: "approved",
          confidence: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ["auto-extracted"]
        });
        saveMemories(allMems);
      }
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const settings = loadSettings();
  const activePersonaKey = conv.personaOverride || settings.defaultPersona || "dragon_queen";
  let basePersonaText = PERSONA_PROFILES[activePersonaKey] || PERSONA_PROFILES["dragon_queen"];

  if (activePersonaKey === "custom" && settings.customPersonaInstructions) {
    basePersonaText = settings.customPersonaInstructions;
  }

  // Active Skills instructions
  const allSkills = loadSkills();
  const activeSkills = allSkills.filter(s => activeSkillIds.includes(s.id) && s.enabled);
  let skillsInstruction = "";
  if (activeSkills.length > 0) {
    skillsInstruction = "\n\n[ACTIVE SKILLS]:\n" + activeSkills.map(s => `- ${s.name}: ${s.instructions}`).join("\n");
  }

  // Connected Apps context
  const apps = loadApps();
  const connectedAppNames = apps.filter(a => a.connected).map(a => a.name).join(", ");
  const connectedContext = connectedAppNames 
    ? `\n[AUTHORIZED CONNECTED APPS]: The following services are authorized and active: ${connectedAppNames}. You can coordinate actions, search documents, reference emails, and draft calendar appointments when requested.`
    : "";

  // Indexed Files knowledge context
  const indexedFiles = loadFileIndex().slice(0, 8);
  const filesContext = indexedFiles.length > 0
    ? `\n[WORKSPACE INDEXED FILES & ARCHIVES]:\n` + indexedFiles.map(f => `- ${f.name} (${f.type}): ${f.contentSnippet?.slice(0, 180)}`).join("\n")
    : "";

  // Intelligent Memory Retrieval (Chapter 19)
  let memoryContext = "";
  if (memSettings.enabled) {
    const allMemories = loadMemories().filter(m => m.consentStatus === "approved");
    let relevantMemories: Memory[] = [];

    const isAskingAboutMemory = message && /(?:what do you remember|what are my preferences|tell me my preferences|what do you know about me)/i.test(message);

    if (isAskingAboutMemory) {
      relevantMemories = allMemories;
    } else if (message) {
      const lowerMsg = message.toLowerCase();
      const words = lowerMsg.split(/\s+/).filter((w: string) => w.length > 3);
      relevantMemories = allMemories.filter(m => {
        const lowerContent = m.content.toLowerCase();
        const contentMatch = words.some((w: string) => lowerContent.includes(w));
        const tagMatch = m.tags && m.tags.some(t => words.includes(t.toLowerCase()));
        return contentMatch || tagMatch;
      }).slice(0, 8); // Increased slice to get more context
    }

    if (relevantMemories.length > 0) {
      memoryContext = `\n[USER-APPROVED PERSISTENT MEMORIES (UNTRUSTED CONTEXT)]:\n` +
        relevantMemories.map(m => `- [${m.category.toUpperCase()}] ${m.content}`).join("\n");
    }
  }

  // Ongoing Projects Context (Chapter 19)
  const allProjects = loadProjects().slice(0, 2);
  const projectsContext = allProjects.length > 0
    ? `\n[ACTIVE PROJECT SUMMARIES]:\n` + allProjects.map(p => `- ${p.name}: ${p.purpose}. Next step: ${p.nextStep}`).join("\n")
    : "";

  let agentInstruction = agentMode 
    ? `\n[AUTONOMOUS AGENT MODE ACTIVE]: You are operating in multi-step agent mode. Deconstruct user goals into sequential tasks, verify intermediate results, and provide comprehensive execution reports with citations.`
    : "";

  const systemInstruction = (settings.systemInstruction ? settings.systemInstruction + "\n" : "") + 
    basePersonaText + 
    skillsInstruction + 
    connectedContext + 
    filesContext + 
    memoryContext + 
    projectsContext + 
    agentInstruction;

  // Build history
  const history = conv.messages.slice(0, -1).map(m => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }]
  }));

  // Build message parts (including multimodal files and text)
  const messageParts: any[] = [];
  if (message) {
    messageParts.push({ text: message });
  }

  for (const att of attachments) {
    if (att.data) {
      const matches = att.data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        if (mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("audio/")) {
          messageParts.push({
            inlineData: {
              mimeType,
              data: base64Data
            }
          });
        } else {
          try {
            const textContent = Buffer.from(base64Data, "base64").toString("utf-8");
            messageParts.push({
              text: `\n[Attached File: ${att.name}]\n\`\`\`\n${textContent.slice(0, 15000)}\n\`\`\`\n`
            });
          } catch {
            messageParts.push({ text: `\n[Attached File: ${att.name} (${att.mimeType})]\n` });
          }
        }
      }
    }
  }

  // Resilient model routing:
  // If user requested pro/argon: gemini-2.5-pro
  // If webSearch is active: gemini-2.5-flash (supports search grounding within quota)
  // Otherwise: gemini-3.8-flash (or user selected model)
  const requestedModel = (model || settings.model || "gemini-2.5-flash").trim();
  let primaryModel = requestedModel;
  if (requestedModel.includes("pro") || requestedModel.includes("argon")) {
    primaryModel = "gemini-2.5-pro";
  } else if (requestedModel.includes("3.8") || requestedModel.includes("latest")) {
    primaryModel = webSearch ? "gemini-2.5-flash" : "gemini-3.8-flash";
  } else {
    primaryModel = "gemini-2.5-flash";
  }

  // Google Search Grounding Configuration
  const useSearch = webSearch !== false;

  let isAborted = false;
  // The request body can finish closing while its response is still streaming.
  // Only treat a response close before completion as a client-side abort.
  res.on("close", () => {
    if (!res.writableEnded) {
      isAborted = true;
    }
  });

  try {
    let resultStream: any = null;
    let activeGroundingEnabled = useSearch;

    // Helper to initiate chat stream
    const initStream = async (targetModel: string, withSearch: boolean) => {
      const toolsConfig = withSearch ? [{ googleSearch: {} }] : undefined;
      const chatSession = ai.chats.create({
        model: targetModel,
        history: history.length > 0 ? history : undefined,
        config: {
          systemInstruction,
          temperature: settings.temperature ?? 0.7,
          tools: toolsConfig
        }
      });
      return await chatSession.sendMessageStream({
        message: messageParts.length > 0 ? messageParts : [{ text: "Hello" }]
      });
    };

    try {
      resultStream = await initStream(primaryModel, useSearch);
    } catch (primaryErr: any) {
      console.warn("Primary stream initiation error:", primaryErr.message);
      // If error occurred with search grounding (e.g. 429 quota exhaustion or search failure),
      // gracefully fall back to stream without search grounding rather than failing the chat!
      if (useSearch) {
        console.log("Falling back to stream without search grounding...");
        activeGroundingEnabled = false;
        try {
          resultStream = await initStream("gemini-3.8-flash", false);
        } catch (fbErr: any) {
          // If gemini-3.8-flash also fails, try gemini-2.5-flash without tools
          resultStream = await initStream("gemini-2.5-flash", false);
        }
      } else {
        // Fallback model retry
        const fallbackModel = primaryModel === "gemini-3.8-flash" ? "gemini-2.5-flash" : "gemini-3.8-flash";
        resultStream = await initStream(fallbackModel, false);
      }
    }

    let fullModelResponse = "";
    let capturedGrounding: GroundingMetadata | null = null;

    for await (const chunk of resultStream) {
      if (isAborted) {
        console.log("Client aborted chat stream");
        break;
      }

      const chunkText = chunk.text || "";
      fullModelResponse += chunkText;

      // Extract real grounding metadata from chunk candidates
      const candidate = (chunk as any).candidates?.[0];
      if (candidate?.groundingMetadata) {
        const gm = candidate.groundingMetadata;
        const queries: string[] = gm.webSearchQueries || [];
        const sources: GroundingSource[] = [];

        if (gm.groundingChunks) {
          for (const gc of gm.groundingChunks) {
            if (gc.web?.uri) {
              try {
                const u = new URL(gc.web.uri);
                sources.push({
                  title: gc.web.title || u.hostname,
                  url: gc.web.uri,
                  domain: u.hostname.replace(/^www\./, "")
                });
              } catch {
                sources.push({
                  title: gc.web.title || gc.web.uri,
                  url: gc.web.uri,
                  domain: "source"
                });
              }
            }
          }
        }

        if (queries.length > 0 || sources.length > 0) {
          capturedGrounding = { queries, sources };
        }
      }

      if (chunkText && !isAborted) {
        res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
      }
    }

    if (capturedGrounding && !isAborted) {
      res.write(`data: ${JSON.stringify({ grounding: capturedGrounding, done: false })}\n\n`);
    }

    if (isAborted) {
      if (fullModelResponse.trim()) {
        const abortedMsg: Message = {
          id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          role: "model",
          content: fullModelResponse + "\n\n*(Generation stopped by user)*",
          timestamp: Date.now(),
          grounding: capturedGrounding || undefined
        };
        conv.messages.push(abortedMsg);
        conv.updatedAt = Date.now();
        saveConversations(convs);
      }
      res.end();
      return;
    }

    const modelMsg: Message = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      role: "model",
      content: fullModelResponse || "Response completed.",
      timestamp: Date.now(),
      grounding: capturedGrounding || undefined
    };
    conv.messages.push(modelMsg);
    conv.updatedAt = Date.now();
    saveConversations(convs);

    res.write(`data: ${JSON.stringify({ done: true, conversationId: conv.id })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Gemini API Error in /api/chat/stream:", err);
    // Remove the orphaned user message if no response was generated at all so conversation isn't corrupted
    const lastUserIdx = conv.messages.findIndex(m => m.id === userMsg.id);
    if (lastUserIdx !== -1) {
      conv.messages.splice(lastUserIdx, 1);
      saveConversations(convs);
    }

    let friendlyError = "Failed to generate response. Please try again.";
    const errMsg = err?.message || String(err);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      friendlyError = "Gemini API rate limit or quota exceeded. Please wait a moment and try again.";
    } else if (errMsg.includes("API key") || errMsg.includes("API_KEY_INVALID")) {
      friendlyError = "Invalid or missing GEMINI_API_KEY. Please verify your environment configuration.";
    } else if (errMsg.length < 200) {
      friendlyError = errMsg;
    }

    res.write(`data: ${JSON.stringify({ error: friendlyError, done: true })}\n\n`);
    res.end();
  }
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
