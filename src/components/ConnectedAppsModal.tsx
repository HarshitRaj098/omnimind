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
  const [githubIssueRepository, setGithubIssueRepository] = useState("");
  const [githubIssueTitle, setGithubIssueTitle] = useState("");
  const [githubIssueBody, setGithubIssueBody] = useState("");
  const [githubIssueLoading, setGithubIssueLoading] = useState(false);
  const [githubChangePath, setGithubChangePath] = useState("");
  const [githubChangeTitle, setGithubChangeTitle] = useState("");
  const [githubChangeBaseBranch, setGithubChangeBaseBranch] = useState("main");
  const [githubChangeContent, setGithubChangeContent] = useState("");
  const [githubChangeLoading, setGithubChangeLoading] = useState(false);
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
  const [eventStart, setEventStart] = useState(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [eventEnd, setEventEnd] = useState(() => {
    const date = new Date(Date.now() + 90 * 60 * 1000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [eventLocation, setEventLocation] = useState("");
  const [selectedDriveFile, setSelectedDriveFile] = useState<{ id: string; name: string; mimeType?: string } | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [sheetRange, setSheetRange] = useState("A1");
  const [sheetValues, setSheetValues] = useState("");

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
      const repositories = Array.isArray(data.repositories) ? data.repositories : [];
      setGithubRepos(repositories);
      if (!githubIssueRepository && repositories.length > 0) setGithubIssueRepository(repositories[0].fullName);
      setGithubLogin(data.login || githubLogin);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not load GitHub repositories.");
    } finally {
      setGithubLoading(false);
    }
  };

  const createGitHubIssue = async () => {
    const repository = githubIssueRepository.trim();
    const title = githubIssueTitle.trim();
    const body = githubIssueBody.trim();
    if (!repository || !title) {
      setTestResult("Choose a repository and enter an issue title.");
      return;
    }
    setGithubIssueLoading(true);
    setTestResult(null);
    try {
      const prepareResponse = await fetch("/api/apps/github/issues/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository, title, body })
      });
      const prepared = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) throw new Error(prepared.error || "Could not prepare GitHub issue.");
      const preview = prepared.preview as { repository: string; title: string; body: string };
      const confirmed = window.confirm(
        "Create a real GitHub issue?\n\nRepository: " + preview.repository + "\nTitle: " + preview.title + "\n\nDescription:\n" + (preview.body || "(No description)") + "\n\nThis confirmation expires in five minutes."
      );
      if (!confirmed) {
        setTestResult("Issue cancelled. Nothing was posted to GitHub.");
        return;
      }
      const response = await fetch("/api/apps/github/issues/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: prepared.actionId, confirm: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not create GitHub issue.");
      setGithubIssueTitle("");
      setGithubIssueBody("");
      setTestResult("Created issue #" + data.number + " in " + (data.repository || repository) + ": " + data.url);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not create GitHub issue.");
    } finally {
      setGithubIssueLoading(false);
    }
  };

  const createGitHubFileChange = async () => {
    const repository = githubIssueRepository.trim();
    const path = githubChangePath.trim();
    const commitMessage = githubChangeTitle.trim();
    if (!repository || !path || !commitMessage || !githubChangeContent.trim()) {
      setTestResult("Choose a repository and provide a file path, title, and full file content.");
      return;
    }
    setGithubChangeLoading(true);
    setTestResult(null);
    try {
      const prepareResponse = await fetch("/api/apps/github/changes/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository, path, content: githubChangeContent, commitMessage, baseBranch: githubChangeBaseBranch })
      });
      const prepared = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) throw new Error(prepared.error || "Could not prepare GitHub file change.");
      const preview = prepared.preview as { repository: string; path: string; baseBranch: string; commitMessage: string; contentPreview: string; contentLength: number; updatingExistingFile: boolean };
      const confirmed = window.confirm(
        "Create a GitHub branch and pull request?\\n\\nRepository: " + preview.repository +
        "\\nFile: " + preview.path + (preview.updatingExistingFile ? " (update existing file)" : " (new file)") +
        "\\nBase branch: " + preview.baseBranch + "\\nPR title: " + preview.commitMessage +
        "\\nContent length: " + preview.contentLength + " characters\\n\\nPreview (first 1200 characters):\\n" +
        preview.contentPreview + "\\n\\nThis creates a branch and opens a PR; it does not merge into the base branch. Confirmation expires in five minutes."
      );
      if (!confirmed) {
        setTestResult("File change cancelled. No branch or pull request was created.");
        return;
      }
      const response = await fetch("/api/apps/github/changes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: prepared.actionId, confirm: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not create GitHub pull request.");
      setGithubChangePath("");
      setGithubChangeTitle("");
      setGithubChangeContent("");
      setTestResult("Created PR #" + data.number + " for " + data.repository + "/" + data.path + ": " + data.url);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not create GitHub pull request.");
    } finally {
      setGithubChangeLoading(false);
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

  const sendEmail = async () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      setWorkspaceError("Fill in the recipient, subject, and message before sending.");
      return;
    }
    if (!window.confirm(`Send this email to ${emailTo.trim()}?\n\nSubject: ${emailSubject.trim()}\n\nThis sends a real email from your connected Gmail account.`)) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch("/api/apps/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo.trim(), subject: emailSubject.trim(), body: emailBody })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the email.");
      setWorkspaceError(`Email sent successfully. Message ID: ${data.messageId || "confirmed"}`);
      setEmailTo(""); setEmailSubject(""); setEmailBody("");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not send the email.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const createCalendarEvent = async () => {
    if (!eventTitle.trim() || !eventStart || !eventEnd || new Date(eventEnd).getTime() <= new Date(eventStart).getTime()) {
      setWorkspaceError("Enter an event title and valid times; the end must be after the start.");
      return;
    }
    const startLabel = new Date(eventStart).toLocaleString();
    const endLabel = new Date(eventEnd).toLocaleString();
    if (!window.confirm(`Create this Google Calendar event?\n\n${eventTitle.trim()}\n${startLabel} – ${endLabel}\n${eventLocation.trim()}\n\nThis creates a real event on your primary calendar.`)) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch("/api/apps/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: eventTitle.trim(),
          start: new Date(eventStart).toISOString(),
          end: new Date(eventEnd).toISOString(),
          location: eventLocation.trim()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not create Calendar event.");
      setWorkspaceError("Calendar event created successfully.");
      setEventTitle(""); setEventLocation("");
      await loadCalendar();
      if (data.htmlLink) window.open(data.htmlLink, "_blank", "noopener,noreferrer");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not create Calendar event.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const saveDriveEdit = async () => {
    if (!selectedDriveFile) return;
    const isDoc = selectedDriveFile.mimeType === "application/vnd.google-apps.document";
    const isSheet = selectedDriveFile.mimeType === "application/vnd.google-apps.spreadsheet";
    if (!isDoc && !isSheet) {
      setWorkspaceError("Editing is available for native Google Docs and Sheets files only.");
      return;
    }
    let values: string[][] = [];
    if (isDoc && !documentText.trim()) {
      setWorkspaceError("Enter the text you want to append to this document.");
      return;
    }
    if (isSheet) {
      values = sheetValues.split("\n").filter((row) => row.length > 0).map((row) => row.split("\t"));
      if (!values.length || values.some(row => row.some(cell => cell.length > 2000))) {
        setWorkspaceError("Enter spreadsheet rows as tab-separated values, one row per line.");
        return;
      }
    }
    const operation = isDoc ? "append text to" : `write values to ${sheetRange} in`;
    if (!window.confirm(`Confirm: ${operation} “${selectedDriveFile.name}”?\n\nThis modifies the live Google file.`)) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch(isDoc ? "/api/apps/docs/append" : "/api/apps/sheets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isDoc
          ? { documentId: selectedDriveFile.id, text: documentText }
          : { spreadsheetId: selectedDriveFile.id, range: sheetRange, values })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the Google file.");
      setWorkspaceError(isDoc ? "Text appended to Google Docs successfully." : `Updated ${data.updatedCells || 0} spreadsheet cells successfully.`);
      setDocumentText(""); setSheetValues("");
      setSelectedDriveFile(null);
      await searchDrive();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not update the Google file.");
    } finally {
      setWorkspaceLoading(false);
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
                {githubLogin ? `Connected as @${githubLogin}. Repository actions are limited to public repositories you own; reconnect if issue creation permission is missing.` : githubOAuthConfigured ? "Authorize your GitHub profile to connect your account." : "Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and APP_URL on the server first."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {githubLogin ? (
                <>
                  <Button size="sm" variant="secondary" disabled={githubLoading} onClick={() => void loadGitHubRepos()}>{githubLoading ? "Loading…" : "Load public repositories"}</Button>
                  <Button size="sm" variant="secondary" disabled={loading} onClick={connectGitHub}>Reconnect permissions</Button>
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
          {githubLogin && githubRepos.length > 0 && (
            <div className="rounded-lg border border-[var(--claude-border-subtle)] p-3 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-[var(--claude-text)]">Create GitHub issue</h4>
                <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">Public repositories you own only. OmniMind shows the exact issue and asks for confirmation before posting.</p>
              </div>
              <select value={githubIssueRepository} onChange={event => setGithubIssueRepository(event.target.value)} aria-label="GitHub repository for new issue" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]">
                {githubRepos.map(repo => <option key={repo.id} value={repo.fullName}>{repo.fullName}</option>)}
              </select>
              <input value={githubIssueTitle} onChange={event => setGithubIssueTitle(event.target.value)} maxLength={256} placeholder="Issue title" aria-label="GitHub issue title" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
              <textarea value={githubIssueBody} onChange={event => setGithubIssueBody(event.target.value)} maxLength={20000} rows={3} placeholder="Description, reproduction steps, expected result…" aria-label="GitHub issue description" className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
              <Button size="sm" variant="primary" disabled={githubIssueLoading || !githubIssueTitle.trim()} onClick={() => void createGitHubIssue()}>{githubIssueLoading ? "Creating issue…" : "Review & create issue"}</Button>
            </div>
          )}
          {githubLogin && githubRepos.length > 0 && (
            <div className="rounded-lg border border-[var(--claude-border-subtle)] p-3 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-[var(--claude-text)]">Propose a repository file change</h4>
                <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">OmniMind creates a separate branch and opens a reviewable PR. It never merges or writes directly to the base branch. Secret files, workflow files, and lockfiles are blocked.</p>
              </div>
              <select value={githubIssueRepository} onChange={event => setGithubIssueRepository(event.target.value)} aria-label="GitHub repository for file change" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]">
                {githubRepos.map(repo => <option key={repo.id} value={repo.fullName}>{repo.fullName}</option>)}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={githubChangePath} onChange={event => setGithubChangePath(event.target.value)} maxLength={240} placeholder="File path (src/example.ts)" aria-label="Repository file path" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
                <input value={githubChangeBaseBranch} onChange={event => setGithubChangeBaseBranch(event.target.value)} maxLength={100} placeholder="Base branch" aria-label="Base branch for pull request" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
              </div>
              <input value={githubChangeTitle} onChange={event => setGithubChangeTitle(event.target.value)} maxLength={120} placeholder="Commit and pull request title" aria-label="Pull request title" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
              <textarea value={githubChangeContent} onChange={event => setGithubChangeContent(event.target.value)} maxLength={50000} rows={6} placeholder="Paste the complete new file content here…" aria-label="Complete repository file content" className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs font-mono text-[var(--claude-text)]" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-[var(--claude-text-muted)]">{githubChangeContent.length.toLocaleString()} / 50,000 characters</span>
                <Button size="sm" variant="primary" disabled={githubChangeLoading || !githubChangePath.trim() || !githubChangeTitle.trim() || !githubChangeContent.trim()} onClick={() => void createGitHubFileChange()}>{githubChangeLoading ? "Preparing PR…" : "Review & open pull request"}</Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Google account</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">
              {googleAccountEmail ? `Authorized as ${googleAccountEmail}` : googleOAuthConfigured ? "Authorize read-only access to supported Google services." : "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL on the server first."}
            </p>
          </div>
          {googleAccountEmail ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={!googleOAuthConfigured || loading} onClick={connectGoogle}>Reauthorize for write access</Button>
              <Button size="sm" variant="danger" disabled={loading} onClick={disconnectGoogle}>Disconnect Google</Button>
            </div>
          ) : (
            <Button size="sm" variant="primary" disabled={!googleOAuthConfigured || loading} onClick={connectGoogle}>Connect Google</Button>
          )}
        </div>

        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Google Workspace tools</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">Read Gmail, search Drive, send email, create Calendar events, and edit native Docs/Sheets. Write actions ask for confirmation first. Reauthorize Google to grant the new write scopes.</p>
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
                  <div className="flex shrink-0 items-center gap-3">
                    {file.mimeType === "application/vnd.google-apps.document" || file.mimeType === "application/vnd.google-apps.spreadsheet" ? (
                      <button type="button" className="text-xs underline text-[var(--claude-text-secondary)]" onClick={() => { setSelectedDriveFile({ id: file.id, name: file.name, mimeType: file.mimeType }); setWorkspaceError(null); }}>
                        Edit
                      </button>
                    ) : null}
                    {file.webViewLink && <a className="text-xs underline text-[var(--claude-text-secondary)]" href={file.webViewLink} target="_blank" rel="noreferrer">Open</a>}
                  </div>
                </div>
              ))}
              {driveFiles.length === 0 && <p className="text-xs text-[var(--claude-text-muted)]">No matching files.</p>}
            </div>
          )}
        </div>
\n        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Send an email</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">A confirmation prompt appears before Gmail sends anything. Requires Gmail send permission.</p>
          </div>
          <input value={emailTo} onChange={event => setEmailTo(event.target.value)} type="email" placeholder="Recipient email" aria-label="Recipient email" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
          <input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} placeholder="Subject" aria-label="Email subject" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
          <textarea value={emailBody} onChange={event => setEmailBody(event.target.value)} rows={4} placeholder="Write your message…" aria-label="Email message" className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
          <div className="flex justify-end">
            <Button size="sm" variant="primary" disabled={workspaceLoading || !googleAccountEmail || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()} onClick={() => void sendEmail()}>{workspaceLoading ? "Working…" : "Review & send email"}</Button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Create a Calendar event</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">Times use your local time zone. OmniMind confirms details before creating the live event.</p>
          </div>
          <input value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="Event title" aria-label="Calendar event title" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-[11px] text-[var(--claude-text-muted)]">Start time<input type="datetime-local" value={eventStart} onChange={event => setEventStart(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" /></label>
            <label className="text-[11px] text-[var(--claude-text-muted)]">End time<input type="datetime-local" value={eventEnd} onChange={event => setEventEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" /></label>
          </div>
          <input value={eventLocation} onChange={event => setEventLocation(event.target.value)} placeholder="Location (optional)" aria-label="Calendar event location" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
          <div className="flex justify-end">
            <Button size="sm" variant="primary" disabled={workspaceLoading || !googleAccountEmail || !eventTitle.trim()} onClick={() => void createCalendarEvent()}>{workspaceLoading ? "Working…" : "Review & create event"}</Button>
          </div>
        </div>

        {selectedDriveFile && (
          <div className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-[var(--claude-text)]">Edit Google file</h3>
                <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">{selectedDriveFile.name} · {selectedDriveFile.mimeType === "application/vnd.google-apps.document" ? "append text to document" : "write values to spreadsheet cells"}</p>
              </div>
              <button type="button" className="text-xs underline text-[var(--claude-text-muted)]" onClick={() => setSelectedDriveFile(null)}>Cancel</button>
            </div>
            {selectedDriveFile.mimeType === "application/vnd.google-apps.document" ? (
              <textarea value={documentText} onChange={event => setDocumentText(event.target.value)} rows={4} placeholder="Text to append to the end of this document…" aria-label="Text to append to Google Docs" className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
            ) : (
              <>
                <input value={sheetRange} onChange={event => setSheetRange(event.target.value)} placeholder="A1 or Sheet1!A1:B3" aria-label="Spreadsheet range" className="w-full rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
                <textarea value={sheetValues} onChange={event => setSheetValues(event.target.value)} rows={4} placeholder={"One row per line; separate cells with tabs\nExample: Name\tScore"} aria-label="Spreadsheet values" className="w-full resize-y rounded-lg border border-[var(--claude-border)] bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text)]" />
              </>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="primary" disabled={workspaceLoading || !googleAccountEmail} onClick={() => void saveDriveEdit()}>{workspaceLoading ? "Saving…" : "Review & save changes"}</Button>
            </div>
          </div>
        )}

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
