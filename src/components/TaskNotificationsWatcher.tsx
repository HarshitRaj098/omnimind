import { useEffect } from "react";

interface ScheduledTaskSnapshot {
  id: string;
  title: string;
  lastRunAt?: number;
  lastResult?: string;
  lastError?: string;
}

const POLL_INTERVAL_MS = 15000;

export function TaskNotificationsWatcher() {
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    let stopped = false;
    let seeded = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const lastRuns = new Map<string, number>();

    const poll = async () => {
      try {
        const response = await fetch("/api/scheduled-tasks", { cache: "no-store" });
        if (!response.ok) return;
        const tasks = await response.json() as ScheduledTaskSnapshot[];
        if (!Array.isArray(tasks) || stopped) return;

        if (!seeded) {
          for (const task of tasks) if (task.lastRunAt) lastRuns.set(task.id, task.lastRunAt);
          seeded = true;
          return;
        }

        for (const task of tasks) {
          const previousRun = lastRuns.get(task.id) || 0;
          if (task.lastRunAt && task.lastRunAt > previousRun) {
            lastRuns.set(task.id, task.lastRunAt);
            const failed = Boolean(task.lastError);
            const detail = (failed ? task.lastError : task.lastResult) || (failed ? "Task failed." : "Task completed.");
            const notification = new Notification(
              failed ? `Task failed: ${task.title}` : `Task completed: ${task.title}`,
              { body: detail.slice(0, 220), tag: `omnimind-task-${task.id}` }
            );
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } else if (task.lastRunAt) {
            lastRuns.set(task.id, Math.max(previousRun, task.lastRunAt));
          }
        }

        for (const id of lastRuns.keys()) {
          if (!tasks.some(task => task.id === id)) lastRuns.delete(id);
        }
      } catch {
        // Notifications are best-effort; a transient network error should not interrupt chat.
      }
    };

    void poll();
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  return null;
}
