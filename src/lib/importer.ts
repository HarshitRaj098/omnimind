
import { Conversation, Message } from "../types";

export interface ImportedConversation {
  title: string;
  messages: Array<{ role: 'user' | 'model', content: string }>;
}

export function validateImportedConversation(data: any): data is ImportedConversation {
  return (
    typeof data.title === 'string' &&
    Array.isArray(data.messages) &&
    data.messages.every((m: any) => 
      ['user', 'model'].includes(m.role) && typeof m.content === 'string'
    )
  );
}

export function mapImportedConversation(imported: ImportedConversation): Conversation {
  return {
    id: "imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: imported.title,
    model: "gemini-2.5-flash",
    messages: imported.messages.map(m => ({
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      role: m.role,
      content: m.content,
      timestamp: Date.now()
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: imported.messages.length
  };
}
