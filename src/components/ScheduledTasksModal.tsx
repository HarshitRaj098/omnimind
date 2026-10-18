import React, { useCallback, useEffect, useState } from "react";
import { Modal, Button, Input, Textarea } from "./ui";
import { AppIcon } from "./AppIcon";

type Frequency = "once" | "daily" | "weekly";
interface ScheduledTask {
  id: string; title: string; prompt: string; frequency: Frequency; nextRunAt: number;
  enabled: boolean; createdAt: number; lastRunAt?: number; lastResult?: string; lastError?: string; runCount: number;
}
interface ScheduledTasksModalProps { isOpen: boolean; onClose: () => void; }

const toLocalInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({ isOpen, onClose }) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [runAt, setRunAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/scheduled-tasks", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || "Could not load scheduled tasks.");
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load scheduled tasks.");
    }
  }, []);

  useEffect(() => { if (isOpen) void loadTasks(); }, [isOpen, loadTasks]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/scheduled-tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt, frequency, nextRunAt: new Date(runAt).getTime() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not schedule task.");
      setTasks(prev => [...prev, data].sort((a, b) => a.nextRunAt - b.nextRunAt));
      setTitle(""); setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule task.");
    } finally { setLoading(false); }
  };

  const toggleTask = async (task: ScheduledTask) => {
    setError(null);
    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !task.enabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update task.");
      setTasks(prev => prev.map(item => item.id === task.id ? data : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update task."); }
  };

  const deleteTask = async (task: ScheduledTask) => {
    setError(null);
    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete task.");
      setTasks(prev => prev.filter(item => item.id !== task.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete task."); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheduled Tasks"
      description="Persistent reminders and read-only connected-app checks. The server and this app tab must stay open for scheduled runs and browser alerts."
      icon={<AppIcon name="calendar" size={18} />} maxWidth="2xl"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--claude-border)] p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Task notifications</div>
            <p className="mt-1 text-xs text-[var(--claude-text-muted)]">
              {notificationPermission === "granted"
                ? "Browser notifications enabled while this app is open."
                : notificationPermission === "denied"
                  ? "Notifications are blocked in browser settings."
                  : notificationPermission === "unsupported"
                    ? "This browser does not support notifications."
                    : "Get a browser alert when a scheduled task finishes or fails."}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void enableNotifications()}
            disabled={notificationPermission === "granted" || notificationPermission === "denied" || notificationPermission === "unsupported"}>
            {notificationPermission === "granted" ? "Enabled" : notificationPermission === "denied" ? "Blocked" : "Enable notifications"}
          </Button>
        </div>
        {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">{error}</div>}
        <form onSubmit={createTask} className="space-y-3 rounded-xl border border-[var(--claude-border)] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name (e.g. Morning inbox check)" />
            <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
              className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] px-3 py-2 text-sm">
              <option value="once">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option>
            </select>
          </div>
          <Textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="What should run? Example: Check my Gmail inbox for recent messages and summarize unread ones." />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs text-[var(--claude-text-muted)]">First run <input type="datetime-local" value={runAt} onChange={e => setRunAt(e.target.value)} required className="ml-2 rounded-lg border border-[var(--claude-border)] bg-[var(--claude-surface)] p-2 text-[var(--claude-text)]" /></label>
            <Button type="submit" variant="primary" disabled={loading || !title.trim() || !prompt.trim()}>{loading ? "Saving…" : "Schedule task"}</Button>
          </div>
        </form>
        <div className="space-y-2">
          {tasks.length === 0 ? <p className="py-6 text-center text-sm text-[var(--claude-text-muted)]">No scheduled tasks yet.</p> : tasks.map(task => (
            <article key={task.id} className="rounded-xl border border-[var(--claude-border)] p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1"><div className="font-medium text-sm">{task.title}</div><p className="mt-1 text-xs text-[var(--claude-text-muted)]">{task.prompt}</p></div>
                <span className={task.enabled ? "text-xs text-emerald-500" : "text-xs text-[var(--claude-text-muted)]"}>{task.enabled ? "Active" : "Paused"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--claude-text-muted)]">
                <span>{task.frequency}</span><span>·</span><span>Next: {task.enabled ? new Date(task.nextRunAt).toLocaleString() : "paused"}</span>
                {task.lastRunAt && <><span>·</span><span>Last run: {new Date(task.lastRunAt).toLocaleString()}</span></>}
              </div>
              {task.lastError && <p className="text-xs text-rose-500">{task.lastError}</p>}
              {task.lastResult && <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--claude-bg)] p-2 text-xs">{task.lastResult}</pre>}
              <div className="flex justify-end gap-2"><Button size="sm" variant="quiet" onClick={() => void toggleTask(task)}>{task.enabled ? "Pause" : "Resume"}</Button><Button size="sm" variant="quiet" onClick={() => void deleteTask(task)}>Delete</Button></div>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
};
