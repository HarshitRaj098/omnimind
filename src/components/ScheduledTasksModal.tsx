import React, { useCallback, useEffect, useState } from "react";
import { Modal, Button, Input, Textarea } from "./ui";
import { AppIcon } from "./AppIcon";

type Frequency = "once" | "daily" | "weekly";
interface ScheduledTaskRun {
  id: string; startedAt: number; finishedAt: number; status: "success" | "failed";
  trigger: "manual" | "scheduled"; result?: string; error?: string;
}
interface ScheduledTask {
  id: string; title: string; prompt: string; frequency: Frequency; nextRunAt: number;
  enabled: boolean; createdAt: number; lastRunAt?: number; lastResult?: string; lastError?: string;
  runCount: number; running?: boolean; runs?: ScheduledTaskRun[]; timeZone?: string;
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
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(() => new Set());
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; prompt: string; frequency: Frequency; runAt: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
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

  useEffect(() => {
    if (!isOpen) return;
    void loadTasks();
    const refreshId = window.setInterval(() => void loadTasks(), 10000);
    return () => window.clearInterval(refreshId);
  }, [isOpen, loadTasks]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/scheduled-tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt, frequency, nextRunAt: new Date(runAt).getTime(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }),
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

  const runTaskNow = async (task: ScheduledTask) => {
    setError(null);
    setRunningTaskIds(prev => new Set(prev).add(task.id));
    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}/run`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (data.task) setTasks(prev => prev.map(item => item.id === task.id ? data.task : item));
      if (!response.ok) throw new Error(data.error || "Task execution failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run task.");
      await loadTasks();
    } finally {
      setRunningTaskIds(prev => { const next = new Set(prev); next.delete(task.id); return next; });
    }
  };

  const beginEditTask = (task: ScheduledTask) => {
    setError(null);
    setEditingTask({
      id: task.id,
      title: task.title,
      prompt: task.prompt,
      frequency: task.frequency,
      runAt: toLocalInput(new Date(task.nextRunAt)),
    });
  };

  const saveTaskEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTask) return;
    setSavingEdit(true);
    setError(null);
    try {
      const response = await fetch(`/api/scheduled-tasks/${encodeURIComponent(editingTask.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTask.title,
          prompt: editingTask.prompt,
          frequency: editingTask.frequency,
          nextRunAt: new Date(editingTask.runAt).getTime(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save task changes.");
      setTasks(prev => prev.map(item => item.id === data.id ? data : item).sort((a, b) => a.nextRunAt - b.nextRunAt));
      setEditingTask(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save task changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteTask = async (task: ScheduledTask) => {
    setError(null);
    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete task.");
      setTasks(prev => prev.filter(item => item.id !== task.id));
      if (editingTask?.id === task.id) setEditingTask(null);
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
                <span>{task.frequency}</span><span>·</span><span>Zone: {task.timeZone || "UTC"}</span><span>·</span><span>Next: {task.enabled ? new Date(task.nextRunAt).toLocaleString() : "paused"}</span>
                {task.lastRunAt && <><span>·</span><span>Last run: {new Date(task.lastRunAt).toLocaleString()}</span></>}
              </div>
              {task.lastError && <p className="text-xs text-rose-500">{task.lastError}</p>}
              {task.lastResult && <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--claude-bg)] p-2 text-xs">{task.lastResult}</pre>}
              {editingTask?.id === task.id && <form onSubmit={saveTaskEdit} className="space-y-3 rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] p-3">
                <Input value={editingTask.title} onChange={e => setEditingTask(current => current ? { ...current, title: e.target.value } : current)} placeholder="Task name" />
                <Textarea rows={3} value={editingTask.prompt} onChange={e => setEditingTask(current => current ? { ...current, prompt: e.target.value } : current)} placeholder="Task instructions" />
                <div className="flex flex-wrap gap-2">
                  <select value={editingTask.frequency} onChange={e => setEditingTask(current => current ? { ...current, frequency: e.target.value as Frequency } : current)}
                    className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] px-3 py-2 text-sm">
                    <option value="once">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option>
                  </select>
                  <label className="text-xs text-[var(--claude-text-muted)]">Next run <input type="datetime-local" value={editingTask.runAt} onChange={e => setEditingTask(current => current ? { ...current, runAt: e.target.value } : current)} required className="ml-2 rounded-lg border border-[var(--claude-border)] bg-[var(--claude-surface)] p-2 text-[var(--claude-text)]" /></label>
                </div>
                <p className="text-xs text-[var(--claude-text-muted)]">Time zone will use this browser's current zone: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}.</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="quiet" onClick={() => setEditingTask(null)} disabled={savingEdit}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={savingEdit || !editingTask.title.trim() || !editingTask.prompt.trim() || !editingTask.runAt}>{savingEdit ? "Saving…" : "Save changes"}</Button>
                </div>
              </form>}
              {task.runs?.length ? <div className="border-t border-[var(--claude-border)] pt-2">
                <div className="mb-2 text-xs font-medium text-[var(--claude-text-muted)]">Recent runs · {task.runCount} total</div>
                <div className="space-y-2">{task.runs.slice(0, 3).map(run => <div key={run.id} className="flex items-start gap-2 text-xs">
                  <span className={run.status === "success" ? "text-emerald-500" : "text-rose-500"}>{run.status === "success" ? "Success" : "Failed"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[var(--claude-text-muted)]">{run.trigger === "manual" ? "Manual" : "Scheduled"} · {new Date(run.finishedAt).toLocaleString()}</div>
                    {(run.error || run.result) && <p className="mt-1 whitespace-pre-wrap break-words text-[var(--claude-text-muted)]">{run.error || run.result}</p>}
                  </div>
                </div>)}</div>
              </div> : <p className="text-xs text-[var(--claude-text-muted)]">No execution history yet · {task.runCount} runs</p>}
              <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => void runTaskNow(task)} disabled={runningTaskIds.has(task.id) || Boolean(task.running)}>{runningTaskIds.has(task.id) || task.running ? "Running…" : "Run now"}</Button><Button size="sm" variant="quiet" onClick={() => beginEditTask(task)} disabled={runningTaskIds.has(task.id) || Boolean(task.running)}>{editingTask?.id === task.id ? "Editing…" : "Edit"}</Button><Button size="sm" variant="quiet" onClick={() => void toggleTask(task)} disabled={runningTaskIds.has(task.id) || Boolean(task.running)}>{task.enabled ? "Pause" : "Resume"}</Button><Button size="sm" variant="quiet" onClick={() => void deleteTask(task)} disabled={runningTaskIds.has(task.id) || Boolean(task.running)}>Delete</Button></div>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
};
