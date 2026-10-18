import React, { useState, useEffect, useRef } from "react";
import { Conversation, ConversationSummary, Message, AppSettings } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { MessageInput } from "./components/MessageInput";
import { SettingsModal } from "./components/SettingsModal";
import { ConnectedAppsModal } from "./components/ConnectedAppsModal";
import { ResearchWorkspaceModal } from "./components/ResearchWorkspaceModal";
import { SkillsWorkspaceModal } from "./components/SkillsWorkspaceModal";
import { ShareModal } from "./components/ShareModal";
import { VoiceModeModal } from "./components/VoiceModeModal";
import { SharedConversationView } from "./components/SharedConversationView";
import { MemoryWorkspaceModal } from "./components/MemoryWorkspaceModal";
import { ScheduledTasksModal } from "./components/ScheduledTasksModal";
import { TaskNotificationsWatcher } from "./components/TaskNotificationsWatcher";

export default function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith("/share/")) {
    const shareId = pathname.split("/share/")[1];
    return <SharedConversationView shareId={shareId} onBackToApp={() => window.location.href = "/"} />;
  }

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState(() => {
    try {
      return window.localStorage.getItem("omnimind:unsent-draft") || "";
    } catch {
      return "";
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
  const [isScheduledTasksModalOpen, setIsScheduledTasksModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem("omnimind:active-skills");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [agentMode, setAgentMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    model: "gemini-3.8-flash",
    temperature: 0.7,
    systemInstruction: "",
    defaultPersona: "dragon_queen",
    activeMode: "normal",
    theme: "dark"
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("omnimind:active-skills", JSON.stringify(activeSkillIds));
    } catch {
      // Skill activation remains usable if browser storage is unavailable.
    }
  }, [activeSkillIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectionResult = params.get("connected_apps");
    if (!connectionResult) return;
    setIsAppsModalOpen(true);
    if (connectionResult === "error") setError("Google account connection was cancelled or failed. Check Connected Apps setup and try again.");
    params.delete("connected_apps");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationFetchSequenceRef = useRef(0);
  // Prevent stale in-flight list/detail requests from resurrecting a deleted chat.
  const deletedConversationIdsRef = useRef(new Set<string>());

  useEffect(() => {
    fetchConversations();
    fetchSettings();
  }, []);

  const draftOwnerIdRef = useRef<string | null>(null);
  const draftInitializedRef = useRef(false);

  useEffect(() => {
    const draftKey = (conversationId: string | null) =>
      conversationId
        ? `omnimind:unsent-draft:${conversationId}`
        : "omnimind:unsent-draft";

    try {
      if (!draftInitializedRef.current) {
        draftInitializedRef.current = true;
        draftOwnerIdRef.current = activeId;
        if (activeId) {
          const savedDraft = window.localStorage.getItem(draftKey(activeId));
          const legacyDraft = window.localStorage.getItem("omnimind:unsent-draft");
          const restoredDraft = savedDraft ?? legacyDraft ?? "";
          if (restoredDraft !== input) setInput(restoredDraft);
        }
        return;
      }

      if (draftOwnerIdRef.current !== activeId) {
        const previousOwnerId = draftOwnerIdRef.current;
        const previousKey = draftKey(previousOwnerId);
        if (input) window.localStorage.setItem(previousKey, input);
        else window.localStorage.removeItem(previousKey);

        const savedNextDraft = window.localStorage.getItem(draftKey(activeId));
        const legacyDraft = previousOwnerId === null
          ? window.localStorage.getItem("omnimind:unsent-draft")
          : null;
        const nextDraft = savedNextDraft ?? legacyDraft ?? "";
        if (activeId && savedNextDraft === null && legacyDraft) {
          window.localStorage.setItem(draftKey(activeId), legacyDraft);
          window.localStorage.removeItem("omnimind:unsent-draft");
        }

        draftOwnerIdRef.current = activeId;
        if (nextDraft !== input) setInput(nextDraft);
        return;
      }

      if (input) window.localStorage.setItem(draftKey(activeId), input);
      else window.localStorage.removeItem(draftKey(activeId));

      // Keep the legacy key in sync only for the no-conversation composer.
      if (!activeId && input) {
        window.localStorage.setItem("omnimind:unsent-draft", input);
      }
    } catch {
      // Draft recovery is optional when browser storage is unavailable.
    }
  }, [activeId, input]);

  useEffect(() => {
    if (activeId) {
      fetchConversationDetail(activeId);
      try {
        window.localStorage.setItem("omnimind:last-conversation", activeId);
      } catch {
        // Remembering the active chat is optional when storage is unavailable.
      }
    } else {
      conversationFetchSequenceRef.current += 1;
      setActiveConversation(null);
    }
  }, [activeId]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data: ConversationSummary[] = await res.json();
        const visibleConversations = data.filter(
          conversation => !deletedConversationIdsRef.current.has(conversation.id)
        );
        setConversations(visibleConversations);
        if (visibleConversations.length > 0 && !activeId) {
          let rememberedId: string | null = null;
          try {
            rememberedId = window.localStorage.getItem("omnimind:last-conversation");
          } catch {
            // Storage may be unavailable in private or restricted browsing contexts.
          }
          const rememberedConversation = visibleConversations.find(
            conversation => conversation.id === rememberedId
          );
          setActiveId(rememberedConversation?.id || visibleConversations[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

  const fetchConversationDetail = async (id: string) => {
    const requestSequence = ++conversationFetchSequenceRef.current;
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (
          requestSequence !== conversationFetchSequenceRef.current ||
          deletedConversationIdsRef.current.has(id)
        ) return;
        setActiveConversation(data);
      }
    } catch (e) {
      console.error("Failed to fetch conversation detail:", e);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat", model: settings.model })
      });
      if (!res.ok) throw new Error("Conversation creation failed");
      const newConv = await res.json();
      if (!newConv?.id) throw new Error("Conversation response did not include an ID");
      setConversations(prev => [{
        id: newConv.id,
        title: newConv.title,
        model: newConv.model,
        updatedAt: newConv.updatedAt,
        createdAt: newConv.createdAt,
        messageCount: 0
      }, ...prev]);
      setActiveId(newConv.id);
      setActiveConversation(newConv);
      setError(null);
    } catch (e) {
      console.error("Failed to create conversation:", e);
      setError("Couldn't create a new chat. Check your connection and try again.");
    }
  };

  const handleDeleteConversation = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result?.success !== true || (result?.deletedId != null && result.deletedId !== id)) {
        throw new Error(result?.error || "Conversation deletion was not confirmed");
      }

      // Tombstone the ID before awaiting anything else. Any older list/detail
      // request that resolves later must not restore this conversation.
      deletedConversationIdsRef.current.add(id);
      conversationFetchSequenceRef.current += 1;

      const localRemaining = conversations.filter(conversation => conversation.id !== id);
      let nextConversations = localRemaining;
      try {
        const listResponse = await fetch("/api/conversations", { cache: "no-store" });
        if (listResponse.ok) {
          const latestConversations: ConversationSummary[] = await listResponse.json();
          nextConversations = latestConversations.filter(
            conversation => !deletedConversationIdsRef.current.has(conversation.id)
          );
        }
      } catch (refreshError) {
        console.warn("Could not refresh conversation list after deletion:", refreshError);
      }

      const nextActive = nextConversations[0] ?? null;
      setConversations(nextConversations);
      if (activeId === id) {
        setActiveConversation(null);
        setActiveId(nextActive?.id ?? null);
      }
      setError(null);
      return true;
    } catch (e) {
      console.error("Failed to delete conversation:", e);
      setError("Couldn't delete this conversation. The chat is still available—check your connection and try again.");
      return false;
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Conversation rename failed");
      }

      const savedTitle = typeof data.title === "string" ? data.title : newTitle;
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: savedTitle } : c));
      setActiveConversation(prev =>
        prev?.id === id ? { ...prev, title: savedTitle } : prev
      );
      setError(null);
      return savedTitle;
    } catch (e) {
      console.error("Failed to rename conversation:", e);
      setError("Couldn't rename this conversation. Check your connection and try again.");
      return null;
    }
  };

  const handleSendMessage = async (textToSend?: string, attachments: any[] = [], webSearch: boolean = true) => {
    const text = textToSend || input;
    if ((!text.trim() && attachments.length === 0) || isGenerating) return;

    setError(null);
    setInput("");
    setIsGenerating(true);

    let currentConvId = activeId;

    if (!currentConvId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: (text || "Chat Session").substring(0, 30), model: settings.model })
        });
        if (!res.ok) throw new Error("Conversation creation failed");
        const newConv = await res.json();
        if (!newConv?.id) throw new Error("Conversation response did not include an ID");
        currentConvId = newConv.id;
        setActiveId(newConv.id);
        setConversations(prev => [{
          id: newConv.id,
          title: newConv.title,
          model: newConv.model,
          updatedAt: newConv.updatedAt,
          createdAt: newConv.createdAt,
          messageCount: 1
        }, ...prev]);
      } catch (e) {
        console.error("Failed to create conversation:", e);
        setInput(text);
        setIsGenerating(false);
        setError("Couldn't start a new chat. Your message is still here—please try again.");
        return;
      }
    }

    const userMsg: Message = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      role: "user",
      content: text || "[Files Attached]",
      timestamp: Date.now(),
      attachments
    };

    const modelMsgId = "msg_" + (Date.now() + 1) + "_" + Math.random().toString(36).substring(2, 7);
    const modelMsg: Message = {
      id: modelMsgId,
      role: "model",
      content: "",
      timestamp: Date.now()
    };

    let accumulatedText = "";
    let textFlushFrame: number | null = null;
    const flushAccumulatedText = () => {
      if (textFlushFrame !== null) {
        cancelAnimationFrame(textFlushFrame);
        textFlushFrame = null;
      }
      if (!accumulatedText) return;
      setActiveConversation(prev => {
        if (!prev) return prev;
        const newMsgs = [...prev.messages];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg?.id !== modelMsgId) {
          newMsgs.push({ ...modelMsg, content: accumulatedText });
        } else {
          newMsgs[newMsgs.length - 1] = { ...lastMsg, content: accumulatedText };
        }
        return { ...prev, messages: newMsgs };
      });
    };
    const scheduleTextFlush = () => {
      if (textFlushFrame !== null) return;
      textFlushFrame = requestAnimationFrame(() => {
        textFlushFrame = null;
        flushAccumulatedText();
      });
    };

    setActiveConversation(prev => {
      if (!prev) return {
        id: currentConvId!,
        title: (text || "Chat Session").substring(0, 30),
        model: settings.model,
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1
      };
      return {
        ...prev,
        messages: [...prev.messages, userMsg]
      };
    });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConvId,
          message: text,
          model: settings.model,
          activeSkillIds,
          agentMode,
          attachments,
          webSearch
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to chat stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let eventBuffer = "";

      const processSseEvent = (eventText: string) => {
        const dataLine = eventText
          .split("\n")
          .find(line => line.startsWith("data: "));
        if (!dataLine) return;

        try {
          const data = JSON.parse(dataLine.substring(6));
          if (data.error) {
            setError(data.error);
            setActiveConversation(prev => {
              if (!prev) return prev;
              return { ...prev, messages: prev.messages.filter(m => m.id !== modelMsgId) };
            });
            return;
          }
          if (data.text) {
            accumulatedText += data.text;
            scheduleTextFlush();
          }
          if (data.grounding) {
            setActiveConversation(prev => {
              if (!prev) return prev;
              const newMsgs = [...prev.messages];
              const lastIndex = newMsgs.length - 1;
              const lastMsg = newMsgs[lastIndex];
              if (lastMsg?.role === "model") {
                newMsgs[lastIndex] = { ...lastMsg, grounding: data.grounding };
              }
              return { ...prev, messages: newMsgs };
            });
          }
          if (data.actionConfirmation) {
            setActiveConversation(prev => {
              if (!prev) return prev;
              const newMsgs = [...prev.messages];
              const lastIndex = newMsgs.length - 1;
              const lastMsg = newMsgs[lastIndex];
              if (lastMsg?.role === "model") {
                const actions = lastMsg.pendingActions || [];
                if (!actions.some(action => action.id === data.actionConfirmation.id)) {
                  newMsgs[lastIndex] = { ...lastMsg, pendingActions: [...actions, data.actionConfirmation] };
                }
              }
              return { ...prev, messages: newMsgs };
            });
          }
          if (data.conversationId && !activeId) setActiveId(data.conversationId);
        } catch (err) {
          console.error("JSON parse error on SSE event:", err);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        eventBuffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        let separatorIndex = eventBuffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const eventText = eventBuffer.slice(0, separatorIndex);
          eventBuffer = eventBuffer.slice(separatorIndex + 2);
          processSseEvent(eventText);
          separatorIndex = eventBuffer.indexOf("\n\n");
        }

        if (done) {
          if (eventBuffer.trim()) processSseEvent(eventBuffer);
          break;
        }
      }

      fetchConversations();
    } catch (err: any) {
      if (err.name === "AbortError") {
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter(m => m.id !== modelMsgId || Boolean(m.content?.trim()))
          };
        });
      } else {
        console.error("Chat stream error:", err);
        setError(err.message || "An error occurred while generating response.");
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter(m => m.id !== modelMsgId || (m.content && m.content.trim().length > 0))
          };
        });
      }
    } finally {
      flushAccumulatedText();
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleResolveChatAction = async (actionId: string, confirm: boolean) => {
    try {
      const response = await fetch("/api/chat/action/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionId, confirm })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not resolve the proposed action.");
      const status = confirm ? (data.status || "confirmed") : "cancelled";
      const resultText = confirm
        ? (data.result ? JSON.stringify(data.result) : "Action confirmed.")
        : "Cancelled. No external changes were made.";
      setActiveConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg => ({
            ...msg,
            pendingActions: msg.pendingActions?.map(action => action.id === actionId
              ? { ...action, status, result: resultText }
              : action)
          }))
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resolve the proposed action.";
      setError(message);
      setActiveConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg => ({
            ...msg,
            pendingActions: msg.pendingActions?.map(action => action.id === actionId
              ? { ...action, status: "failed", result: message }
              : action)
          }))
        };
      });
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    let lastUserText = "";
    let lastAttachments: any[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserText = msgs[i].content;
        lastAttachments = msgs[i].attachments || [];
        break;
      }
    }
    if (lastUserText || lastAttachments.length > 0) {
      setError(null);
      setActiveConversation(prev => {
        if (!prev) return prev;
        const messages = [...prev.messages];
        if (messages[messages.length - 1]?.role === "model") messages.pop();
        if (messages[messages.length - 1]?.role === "user") messages.pop();
        return { ...prev, messages };
      });
      handleSendMessage(lastUserText, lastAttachments);
    }
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length < 2 || isGenerating) return;
    const msgs = activeConversation.messages;
    let lastUserText = "";
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserText = msgs[i].content;
        break;
      }
    }
    if (lastUserText) {
      setActiveConversation(prev => {
        if (!prev) return prev;
        const newMsgs = [...prev.messages];
        newMsgs.pop();
        newMsgs.pop();
        return { ...prev, messages: newMsgs };
      });
      handleSendMessage(lastUserText);
    }
  };

  const handleTogglePinConversation = async (id: string, pinned: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update pinned conversation.");
        return false;
      }

      setConversations(prev =>
        prev
          .map(conversation => conversation.id === id
            ? { ...conversation, pinned: Boolean(data.pinned) }
            : conversation)
          .sort((a, b) =>
            Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
            b.updatedAt - a.updatedAt
          )
      );
      setActiveConversation(prev =>
        prev?.id === id ? { ...prev, pinned: Boolean(data.pinned) } : prev
      );
      setError(null);
      return true;
    } catch (e) {
      console.error("Failed to update pinned conversation:", e);
      setError("Could not update the pinned state. Check the server connection.");
      return false;
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const toggleSkillActivation = (id: string) => {
    setActiveSkillIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleTestSkill = (id: string, prompt: string) => {
    setActiveSkillIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setInput(prompt);
    setIsSkillsModalOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <TaskNotificationsWatcher />
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
        onTogglePin={handleTogglePinConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
      />

      {/* Main Chat View */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatArea
          conversation={activeConversation}
          isGenerating={isGenerating}
          onSendMessage={(txt) => handleSendMessage(txt)}
          onRegenerate={handleRegenerate}
          onRetry={handleRetry}
          onDismissError={() => setError(null)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          error={error}
          onShare={() => setIsShareModalOpen(true)}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          onOpenSkills={() => setIsSkillsModalOpen(true)}
          onOpenResearch={() => setIsResearchModalOpen(true)}
          onOpenApps={() => setIsAppsModalOpen(true)}
          onOpenTasks={() => setIsScheduledTasksModalOpen(true)}
          onOpenMemory={() => setIsMemoryModalOpen(true)}
          onResolveAction={handleResolveChatAction}
        />

        <div className="w-full shrink-0">
          <MessageInput
            input={input}
            setInput={setInput}
            onSend={(atts, webSearch) => handleSendMessage(undefined, atts, webSearch)}
            onStop={handleStop}
            isGenerating={isGenerating}
            selectedModel={settings.model}
            onSelectModel={(model) => setSettings(s => ({ ...s, model }))}
            agentMode={agentMode}
            setAgentMode={setAgentMode}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Connected Apps Modal */}
      <ConnectedAppsModal
        isOpen={isAppsModalOpen}
        onClose={() => setIsAppsModalOpen(false)}
      />

      <ScheduledTasksModal
        isOpen={isScheduledTasksModalOpen}
        onClose={() => setIsScheduledTasksModalOpen(false)}
      />

      {/* Research Workspace Modal */}
      <ResearchWorkspaceModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />

      {/* Skills Workspace Modal */}
      <SkillsWorkspaceModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        activeSkillIds={activeSkillIds}
        onToggleSkillActivation={toggleSkillActivation}
        onTestSkill={handleTestSkill}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        conversationId={activeConversation?.id || null}
        conversationTitle={activeConversation?.title || "Conversation"}
      />

      {/* Voice Mode Modal */}
      <VoiceModeModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        personaName={settings.defaultPersona}
      />

      {/* Persistent Memory Workspace Modal */}
      <MemoryWorkspaceModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />
    </div>
  );
}
