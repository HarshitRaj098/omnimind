import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Input, Tabs, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";

interface IndexedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  contentSnippet?: string;
  uploadedAt: number;
}

interface ResearchWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchWorkspaceModal: React.FC<ResearchWorkspaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "crawl">("files");
  const [urlInput, setUrlInput] = useState("");
  const [crawlResult, setCrawlResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error("Failed to load files", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    setLoading(true);
    for (const file of Array.from(uploadedFiles)) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/files/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              mimeType: file.type || "application/octet-stream",
              data: reader.result as string,
            }),
          });
          if (res.ok) {
            fetchFiles();
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      };
      reader.readAsDataURL(file);
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleRunCrawler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setCrawlResult(null);
    try {
      const res = await fetch("/api/research/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "crawl", query: urlInput.trim() }),
      });
      const data = await res.json();
      setCrawlResult(data);
    } catch (e: any) {
      setCrawlResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Research & Knowledge Workspace"
      description="Manage indexed files, ZIP archives, documents, and web crawler research"
      icon={<AppIcon name="research" size={18} />}
      maxWidth="2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Tab Navigation */}
        <Tabs
          options={[
            { id: "files", label: "Indexed Files & ZIPs", count: files.length },
            { id: "crawl", label: "Controlled Web Crawler" },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as "files" | "crawl")}
          variant="segmented"
        />

        {activeTab === "files" ? (
          <div className="space-y-4 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip,.pdf,.docx,.txt,.csv,.json,.ts,.tsx,.js"
              multiple
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--claude-bg)] border border-[var(--claude-border)]">
              <div>
                <h3 className="text-xs font-semibold text-[var(--claude-text)]">
                  Knowledge Index
                </h3>
                <p className="text-[11px] text-[var(--claude-text-muted)]">
                  Uploaded ZIP archives are automatically extracted and indexed into memory.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                loading={loading}
                icon={<AppIcon name="upload" size={14} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Files / ZIP
              </Button>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[var(--claude-border)] rounded-xl text-[var(--claude-text-muted)] text-xs">
                No files or ZIP archives uploaded yet. Upload documents or code to give OmniMind direct knowledge.
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] flex items-center justify-between gap-3 transition-colors hover:border-[var(--claude-border-subtle)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-[var(--claude-border-subtle)] text-[var(--claude-text-secondary)] shrink-0 flex items-center justify-center">
                        <AppIcon name="file" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--claude-text)] truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-[var(--claude-text-muted)] flex items-center gap-2 font-mono">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span>·</span>
                          <span className="capitalize">{file.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="quiet"
                        icon={<AppIcon name="trash" size={14} />}
                        onClick={() => handleDeleteFile(file.id)}
                        title="Delete File"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <form onSubmit={handleRunCrawler} className="flex gap-2">
              <Input
                placeholder="Enter public HTTPS URL (e.g., https://example.com/docs)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                icon={<AppIcon name="globe" size={14} />}
              />
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                disabled={!urlInput.trim()}
              >
                Crawl
              </Button>
            </form>

            {crawlResult && (
              <div className="p-4 rounded-xl bg-[var(--claude-bg)] border border-[var(--claude-border)] text-xs space-y-2 font-mono">
                {crawlResult.error ? (
                  <div className="text-rose-500 flex items-center gap-2">
                    <AppIcon name="error" size={14} />
                    <span>Error: {crawlResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--claude-text)]">
                        {crawlResult.title || "Page Title"}
                      </span>
                      <StatusText status="active" label="Crawled" />
                    </div>
                    <p className="text-[var(--claude-text-muted)] text-[11px] line-clamp-6 whitespace-pre-wrap leading-relaxed">
                      {crawlResult.contentSnippet || JSON.stringify(crawlResult)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
