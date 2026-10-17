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

  useEffect(() => {
    if (isOpen) {
      fetchApps();
    }
  }, [isOpen]);

  const fetchApps = async () => {
    try {
      const res = await fetch("/api/apps");
      if (res.ok) {
        const data = await res.json();
        setApps(data);
      }
    } catch (e) {
      console.error("Failed to load connected apps", e);
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
      if (res.ok) {
        const updated = await res.json();
        setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      }
    } catch (e) {
      console.error("Failed to toggle app", e);
    } finally {
      setLoading(false);
    }
  };

  const testTool = async (toolName: string, label: string) => {
    setTestResult(`Testing ${label}...`);
    try {
      const res = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toolName, args: { query: "test" } }),
      });
      const data = await res.json();
      if (data.error) {
        setTestResult(`Error: ${label} - ${data.error}`);
      } else {
        setTestResult(`Success: ${label} response received.`);
      }
    } catch (e: any) {
      setTestResult(`Failure: ${e.message}`);
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
                      <p className="text-[10px] text-[var(--claude-text-muted)] font-mono capitalize">
                        {app.category}
                      </p>
                    </div>
                  </div>

                  <StatusText
                    status={isConnected ? "active" : "inactive"}
                    label={isConnected ? "Connected" : "Disconnected"}
                  />
                </div>

                <div className="pt-2 border-t border-[var(--claude-border-subtle)] flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] text-[var(--claude-text-muted)] truncate max-w-[150px]"
                    title={app.scopes.join(", ")}
                  >
                    {app.scopes.length} scopes granted
                  </span>

                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() => testTool(app.id, app.name)}
                      >
                        Test
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isConnected ? "danger" : "primary"}
                      disabled={loading}
                      onClick={() => toggleApp(app.id, isConnected)}
                    >
                      {isConnected ? "Disconnect" : "Connect"}
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
