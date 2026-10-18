export interface GroundingSource {
  title: string;
  url: string;
  domain?: string;
}

export interface GroundingMetadata {
  queries?: string[];
  sources?: GroundingSource[];
}

export interface PendingChatAction {
  id: string;
  type: "gmail_send" | "calendar_create" | "tasks_create" | "tasks_complete";
  summary: string;
  details: string;
  status: "pending" | "confirmed" | "cancelled" | "failed";
  result?: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  attachments?: { name: string; mimeType: string; data: string }[];
  grounding?: GroundingMetadata;
  pendingActions?: PendingChatAction[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  personaOverride?: string;
  pinned?: boolean;
  updatedAt: number;
  createdAt: number;
  messageCount: number;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

export interface AppSettings {
  model: string;
  temperature: number;
  systemInstruction: string;
  defaultPersona: string;
  customPersonaInstructions?: string;
  activeMode: "normal" | "dragon" | "quiet" | "affectionate";
  theme: string;
  webSearchDefault?: boolean;
}

export type MemoryCategory = "preference" | "project" | "instruction" | "context";

export interface Memory {
  id: string;
  userId: string;
  category: MemoryCategory;
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

export interface MemorySettings {
  enabled: boolean;
  autoSuggest: boolean;
  requireConsent: boolean;
  retentionDays?: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  purpose: string;
  techStack: string[];
  decisions: string[];
  currentMilestone: string;
  nextStep: string;
  updatedAt: number;
}

export interface SearchResultItem {
  id: string;
  type: "conversation" | "memory" | "file";
  title: string;
  snippet: string;
  timestamp: number;
  metadata?: any;
}
