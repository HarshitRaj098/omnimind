import React, { useState, useEffect } from "react";
import { Modal, Button, StatusText } from "./ui";
import { AppIcon, IconName } from "./AppIcon";

interface ConnectedApp {
  id: string;
  name: string;
  category: "google" | "youtube" | "whatsapp";
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
      }
    } catch (e) {
      console.error("Failed to load connected apps", e);
      setTestResult("Could not load connection status. Check the OmniMind server.");
    }
  };

  const connectGoogle = () => window.location.assign("/api/apps/google/connect");

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--claude-text)]">Google account</h3>
            <p className="mt-1 text-[11px] text-[var(--claude-text-muted)]">
              {googleAccountEmail ? `Authorized as ${googleAccountEmail}` : googleOAuthConfigured ? "Authorize read-only access to supported Google services." : "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL on the server first."}
            </p>
          </div>
          {googleAccountEmail ? (
            <Button size="sm" variant="danger" disabled={loading} onClick={disconnectGoogle}>Disconnect Google</Button>
          ) : (
            <Button size="sm" variant="primary" disabled={!googleOAuthConfigured || loading} onClick={connectGoogle}>Connect Google</Button>
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
                        {isConnected ? (app.accountEmail || "Google account authorized") : app.category === "whatsapp" ? "Meta Business API setup required" : googleOAuthConfigured ? "Connect your Google account above" : "Google OAuth setup required"}
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
                    {isConnected ? `${app.scopes.length} authorized scopes` : app.category === "whatsapp" ? "Requires Meta credentials" : "Not authorized"}
                  </span>

                  <div className="flex items-center gap-2">

                    <Button
                      size="sm"
                      variant={isConnected ? "danger" : "secondary"}
                      disabled={loading || !isConnected}
                      onClick={() => app.category === "whatsapp" ? toggleApp(app.id, isConnected) : disconnectGoogle()}
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
