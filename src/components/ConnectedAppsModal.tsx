import React, { useState, useEffect } from "react";
import { Modal, Button, StatusText } from "./ui";
import { AppIcon, IconName } from "./AppIcon";

interface ConnectedApp {
  id: string;
  name: string;
  category: "google" | "youtube" | "whatsapp" | "github";
  connected: boolean;
  scopes: string[];
  lastConnected?: number;
  accountEmail?: string;
}

interface ConnectedAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectedAppsModal: React.FC<ConnectedAppsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);
  const [githubOAuthConfigured, setGithubOAuthConfigured] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<Array<{ id: number; fullName: string; description?: string | null; url: string; language?: string | null; stars: number; updatedAt: string }>>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [gmailMessages, setGmailMessages] = useState<Array<{ id: string; subject: string; from: string; date: string; snippet: string }>>([]);
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; mimeType?: string; modifiedTime?: string; webViewLink?: string }>>([]);
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; summary: string; start: string; end: string; htmlLink: string; location: string }>>([]);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [pendingAction, setPendingAction] = useState<{ actionId: string; preview: Record<string, unknown>; kind: "gmail_send" | "calendar_create" } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);


  useEffect(() => {
    if (isOpen) {
      fetchApps();
    }
  }, [isOpen]);

  const fetchApps = async () => {
    try {
      const [appsResponse, statusResponse] = await Promise.all([fetch("/api/apps"), fetch("/api/apps/status")]);
      if (appsResponse.ok) setApps(await appsResponse.json());
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setGoogleOAuthConfigured(Boolean(status.googleOAuthConfigured));
        setGoogleAccountEmail(status.googleAccountEmail || null);
        setGithubOAuthConfigured(Boolean(status.githubOAuthConfigured));
        setGithubLogin(status.githubLogin || null);
      }
    } catch (e) {
      console.error("Failed to load connected apps", e);
      setTestResult("Could not load connection status. Check the OmniMind server.");
    }
  };

  const connectGoogle = () => window.location.assign("/api/apps/google/connect");
  const connectGitHub = () => window.location.assign("/api/apps/github/connect");

  const loadGitHubRepos = async () => {
    setGithubLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/apps/github/repos", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load GitHub repositories.");
      setGithubRepos(Array.isArray(data.repositories) ? data.repositories : []);
      setGithubLogin(data.login || githubLogin);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not load GitHub repositories.");
    } finally {
      setGithubLoading(false);
    }
  };

  const disconnectGitHub = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/apps/github/disconnect", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not disconnect GitHub.");
      setGithubLogin(null);
      setGithubRepos([]);
      setApps(prev => prev.map(app => app.id === "github" ? { ...app, connected: false, lastConnected: undefined } : app));
      setTestResult("GitHub account disconnected from OmniMind.");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not disconnect GitHub.");
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setDriveFiles([]);
    try {
      const response = await fetch("/api/apps/gmail/messages?limit=10", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not read Gmail inbox.");
      setGmailMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not read Gmail inbox.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const searchDrive = async () => {
    if (!workspaceQuery.trim()) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setGmailMessages([]);
    try {
      const response = await fetch(`/api/apps/drive/files?q=${encodeURIComponent(workspaceQuery.trim())}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not search Google Drive.");
      setDriveFiles(Array.isArray(data.files) ? data.files : []);
      if (!Array.isArray(data.files) || data.files.length === 0) setWorkspaceError("No matching Drive files found.");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not search Google Drive.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadCalendar = async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setGmailMessages([]);
    setDriveFiles([]);
    try {
      const response = await fetch("/api/apps/calendar/events?days=7", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load Google Calendar events.");
      setCalendarEvents(Array.isArray(data.events) ? data.events : []);
      if (!Array.isArray(data.events) || data.events.length === 0) {
        setWorkspaceError("No upcoming Calendar events were found in the next seven days.");
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not load Google Calendar events.");
    } finally {
      setWorkspaceLoading(false);
    }
  };


  const prepareConnectedAction = async (kind: "gmail_send" | "calendar_create") => {
    setActionBusy(true);
    setWorkspaceError(null);
    setPendingAction(null);
    const payload = kind === "gmail_send"
      ? { kind, to: emailTo, subject: emailSubject, body: emailBody }
      : { kind, summary: eventTitle, start: eventStart, end: eventEnd, location: eventLocation, description: eventDescription };
    try {
      const response = await fetch("/api/apps/actions/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not prepare this action.");
      setPendingAction({ actionId: data.actionId, preview: data.preview || {}, kind });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not prepare this action.");
    } finally {
      setActionBusy(false);
    }
  };

  const executePreparedAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    setWorkspaceError(null);
    try {
      const response = await fetch("/api/apps/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: pendingAction.actionId, confirm: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The action could not be completed.");
      setTestResult(data.message || "Action completed.");
      if (pendingAction.kind === "gmail_send") {
        setEmailTo("");
        setEmailSubject("");
        setEmailBody("");
      } else {
        setEventTitle("");
        setEventStart("");
        setEventEnd("");
        setEventLocation("");
        setEventDescription("");
        void loadCalendar();
      }
      setPendingAction(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setActionBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/apps/google/disconnect", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not disconnect Google.");
      setGoogleAccountEmail(null);
      setApps(prev => prev.map(app => app.category === "whatsapp"
        ? app
        : { ...app, connected: false, accountEmail: undefined, lastConnected: undefined }));
      setTestResult("Google account disconnected from OmniMind.");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not disconnect Google.");
    } finally {
      setLoading(false);
    }
  };

  const toggleApp = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/apps/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: !currentStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult(data.error || `Could not update ${id}.`);
        return;
      }
      setApps((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch (e) {
      console.error("Failed to toggle app", e);
      setTestResult(`Could not update ${id}. Check the server connection.`);
    } finally {
      setLoading(false);
    }
  };

  const getAppIconName = (id: string): IconName => {
    switch (id) {
      case "gmail":
        return "mail";
      case "drive":
        return "folder";
      case "docs":
        return "file";
      case "sheets":
        return "table";
      case "calendar":
        return "calendar";
      case "youtube":
        return "youtube";
      case "github":
        return "globe";
      case "whatsapp":
        return "message";
      default:
        return "apps";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connected Apps & Workspace"
      description="Manage Google Workspace, YouTube Data, and external service tool integrations"
      icon={<AppIcon name="apps" size={18} />}
      maxWidth="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-[var(--claude-text)]">GitHub account</h3>
              <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">
                {githubLogin ? `Connected as @${githubLogin}. Profile access only; repository browsing is limited to public repositories.` : githubOAuthConfigured ? "Authorize your GitHub profile to connect your account." : "Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and APP_URL on the server first."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {githubLogin ? (
                <>
                  <Button size="sm" variant="secondary" disabled={githubLoading} onClick={() => void loadGitHubRepos()}>{githubLoading ? "Loading…" : "Load public repositories"}</Button>
                  <Button size="sm" variant="danger" disabled={loading} onClick={disconnectGitHub}>Disconnect GitHub</Button>
                </>
              ) : (
                <Button size="sm" variant="primary" disabled={!githubOAuthConfigured || loading} onClick={connectGitHub}>Connect GitHub</Button>
              )}
            </div>
          </div>
          {githubRepos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--claude-text-muted)]">Public repositories · recently updated</p>
              {githubRepos.map(repo => (
                <div key={repo.id} className="rounded-lg border border-[var(--claude-border-subtle)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--claude-text)]">{repo.fullName}</p>
                      {repo.description && <p className="mt-1 text-xs text-[var(--claude-text-secondary)]">{repo.description}</p>}
                      <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">{repo.language || "Unspecified language"} · ★ {repo.stars} · Updated {new Date(repo.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <a className="shrink-0 text-xs underline text-[var(--claude-text-secondary)]" href={repo.url} target="_blank" rel="noreferrer">Open</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Google account</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">
              {googleAccountEmail ? `Authorized as ${googleAccountEmail}` : googleOAuthConfigured ? "Authorize the Google Workspace permissions you want OmniMind to use. Read and write actions require different scopes." : "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL on the server first."}
            </p>
          </div>
          {googleAccountEmail ? (
            <Button size="sm" variant="danger" disabled={loading} onClick={disconnectGoogle}>Disconnect Google</Button>
          ) : (
            <Button size="sm" variant="primary" disabled={!googleOAuthConfigured || loading} onClick={connectGoogle}>Connect Google</Button>
          )}
        </div>

        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Google Workspace tools</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">Read your inbox or search Drive using the account you authorized above. These actions are read-only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={workspaceLoading || !googleAccountEmail} onClick={() => void loadInbox()}>
              {workspaceLoading ? "Loading…" : "Read recent inbox"}
            </Button>
            <Button size="sm" variant="secondary" disabled={workspaceLoading || !googleAccountEmail} onClick={() => void loadCalendar()}>
              {workspaceLoading ? "Loading…" : "Upcoming Calendar"}
            </Button>
            <input
              value={workspaceQuery}
              onChange={(event) => setWorkspaceQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void searchDrive(); }}
              placeholder="Search Drive file names"
              aria-label="Search Google Drive file names"
              className="min-w-0 flex-1 rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]"
            />
            <Button size="sm" variant="secondary" disabled={workspaceLoading || !googleAccountEmail || !workspaceQuery.trim()} onClick={() => void searchDrive()}>
              {workspaceLoading ? "Searching…" : "Search Drive"}
            </Button>
          </div>
          {workspaceError && <p role="alert" className="text-xs text-red-400">{workspaceError}</p>}
          {gmailMessages.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--claude-text-muted)]">Recent Gmail messages</p>
              {gmailMessages.map(message => (
                <div key={message.id} className="rounded-lg border border-[var(--claude-border-subtle)] p-3">
                  <p className="text-xs font-medium text-[var(--claude-text)]">{message.subject}</p>
                  <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">{message.from}{message.date ? ` · ${message.date}` : ""}</p>
                  <p className="mt-1 text-xs text-[var(--claude-text-secondary)]">{message.snippet}</p>
                </div>
              ))}
            </div>
          )}
          {calendarEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--claude-text-muted)]">Upcoming Calendar events · next 7 days</p>
              {calendarEvents.map(event => (
                <div key={event.id} className="rounded-lg border border-[var(--claude-border-subtle)] p-3">
                  <p className="text-xs font-medium text-[var(--claude-text)]">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">
                    {event.start ? new Date(event.start).toLocaleString() : "Date not available"}
                    {event.end ? ` · until ${new Date(event.end).toLocaleString()}` : ""}
                  </p>
                  {event.location && <p className="mt-1 text-xs text-[var(--claude-text-secondary)]">{event.location}</p>}
                  {event.htmlLink && <a className="mt-2 inline-block text-xs underline text-[var(--claude-text-secondary)]" href={event.htmlLink} target="_blank" rel="noreferrer">Open in Google Calendar</a>}
                </div>
              ))}
            </div>
          )}
          {driveFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--claude-text-muted)]">Google Drive results</p>
              {driveFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--claude-border-subtle)] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--claude-text)]">{file.name}</p>
                    <p className="text-[10px] text-[var(--claude-text-muted)]">{file.mimeType || "Google Drive file"}{file.modifiedTime ? ` · Updated ${new Date(file.modifiedTime).toLocaleDateString()}` : ""}</p>
                  </div>
                  {file.webViewLink && <a className="shrink-0 text-xs underline text-[var(--claude-text-secondary)]" href={file.webViewLink} target="_blank" rel="noreferrer">Open</a>}
                </div>
              ))}
              {driveFiles.length === 0 && <p className="text-xs text-[var(--claude-text-muted)]">No matching files.</p>}
            </div>
          )}
        </div>
\n
        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Write actions · confirmation required</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">Prepare an email or Calendar event, review the exact payload, then confirm before OmniMind sends or creates anything. Reconnect Google to grant the new write permissions.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--claude-text)]">Send Gmail</h4>
              <input value={emailTo} onChange={event => setEmailTo(event.target.value)} type="email" placeholder="Recipient email" aria-label="Email recipient" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} placeholder="Subject" aria-label="Email subject" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <textarea value={emailBody} onChange={event => setEmailBody(event.target.value)} placeholder="Message body" aria-label="Email message body" rows={4} className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <Button size="sm" variant="secondary" disabled={actionBusy || !googleAccountEmail || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()} onClick={() => void prepareConnectedAction("gmail_send")}>Review email</Button>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--claude-text)]">Create Calendar event</h4>
              <input value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="Event title" aria-label="Calendar event title" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <label className="block text-[10px] text-[var(--claude-text-muted)]">Start date and time<input value={eventStart} onChange={event => setEventStart(event.target.value)} type="datetime-local" aria-label="Calendar event start" className="mt-1 w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" /></label>
              <label className="block text-[10px] text-[var(--claude-text-muted)]">End date and time<input value={eventEnd} onChange={event => setEventEnd(event.target.value)} type="datetime-local" aria-label="Calendar event end" className="mt-1 w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" /></label>
              <input value={eventLocation} onChange={event => setEventLocation(event.target.value)} placeholder="Location (optional)" aria-label="Calendar event location" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <textarea value={eventDescription} onChange={event => setEventDescription(event.target.value)} placeholder="Description (optional)" aria-label="Calendar event description" rows={2} className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
              <Button size="sm" variant="secondary" disabled={actionBusy || !googleAccountEmail || !eventTitle.trim() || !eventStart || !eventEnd} onClick={() => void prepareConnectedAction("calendar_create")}>Review event</Button>
            </div>
          </div>
          {pendingAction && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[var(--claude-text)]">Confirm {pendingAction.kind === "gmail_send" ? "email send" : "Calendar event creation"}</p>
                <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">This preview expires in five minutes. Nothing has happened yet.</p>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--claude-bg)] p-3 text-[11px] text-[var(--claude-text-secondary)]">{JSON.stringify(pendingAction.preview, null, 2)}</pre>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" disabled={actionBusy} onClick={() => void executePreparedAction()}>{actionBusy ? "Working…" : pendingAction.kind === "gmail_send" ? "Confirm & send email" : "Confirm & create event"}</Button>
                <Button size="sm" variant="secondary" disabled={actionBusy} onClick={() => setPendingAction(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-[var(--claude-bg)] border border-[var(--claude-border)] text-xs font-mono text-[var(--claude-text-secondary)]">
            {testResult}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {apps.map((app) => {
            const isConnected = app.connected;
            return (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] flex flex-col justify-between gap-3 transition-colors hover:border-[var(--claude-border-subtle)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--claude-border-subtle)] text-[var(--claude-text-secondary)] shrink-0 flex items-center justify-center">
                      <AppIcon name={getAppIconName(app.id)} size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-[var(--claude-text)]">
                        {app.name}
                      </h3>
                      <p className="text-[10px] text-[var(--claude-text-muted)]">
                        {isConnected ? (app.category === "github" ? `GitHub @${githubLogin || "account"}` : app.accountEmail || "Google account authorized") : app.category === "whatsapp" ? "Meta Business API setup required" : app.category === "github" ? (githubOAuthConfigured ? "Connect GitHub above" : "GitHub OAuth setup required") : googleOAuthConfigured ? "Connect your Google account above" : "Google OAuth setup required"}
                      </p>
                    </div>
                  </div>

                  <StatusText
                    status={isConnected ? "active" : "inactive"}
                    label={isConnected ? "Connected" : "Disconnected"}
                  />
                </div>

                <div className="pt-2 border-t border-[var(--claude-border-subtle)] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--claude-text-muted)]">
                    {isConnected ? `${app.scopes.length} authorized scopes` : app.category === "whatsapp" ? "Requires Meta credentials" : app.category === "github" ? "Profile access only" : "Not authorized"}
                  </span>

                  <div className="flex items-center gap-2">

                    <Button
                      size="sm"
                      variant={isConnected ? "danger" : "secondary"}
                      disabled={loading || !isConnected}
                      onClick={() => app.category === "whatsapp" ? toggleApp(app.id, isConnected) : app.category === "github" ? disconnectGitHub() : disconnectGoogle()}
                    >
                      {isConnected ? "Disconnect account" : "Not connected"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
