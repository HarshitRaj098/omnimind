import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Input } from "./ui";
import { AppIcon } from "./AppIcon";

type StudioTab = "library" | "image" | "video";
interface LibraryItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  contentSnippet?: string;
  uploadedAt: number;
  mimeType?: string;
  kind?: "file" | "image" | "video";
}
interface Props { isOpen: boolean; onClose: () => void; }

export const MediaLibraryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<StudioTab>("library");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [busy, setBusy] = useState<"upload" | "image" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const response = await fetch("/api/files", { cache: "no-store" });
    if (!response.ok) throw new Error("Couldn't load the library.");
    setItems(await response.json());
  };

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    refresh().catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the library."));
  }, [isOpen]);

  const filtered = useMemo(() => items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.contentSnippet || "").toLowerCase().includes(search.toLowerCase()) ||
    item.type.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("upload"); setError(null); setNotice(null);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Couldn't read the file."));
        reader.onerror = () => reject(new Error("Couldn't read the file."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/files/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", data })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      await refresh();
      setNotice(result.isZip ? `Archive imported: ${result.extractedCount} entries processed.` : "File saved to your library.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusy(null); }
  };

  const generate = async (kind: "image" | "video") => {
    const prompt = (kind === "image" ? imagePrompt : videoPrompt).trim();
    if (!prompt) return;
    setBusy(kind); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/media/${kind}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `${kind === "image" ? "Image" : "Video"} generation failed.`);
      await refresh();
      setTab("library");
      setNotice(`${kind === "image" ? "Image" : "Video"} generated and saved to your library.`);
      if (kind === "image") setImagePrompt("");
      else setVideoPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally { setBusy(null); }
  };

  const handleDelete = async (item: LibraryItem) => {
    if (!window.confirm(`Delete "${item.name}" from your library?`)) return;
    setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.error || "Delete failed.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("Item deleted.");
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
  };

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const urlFor = (item: LibraryItem) => `/api/files/${encodeURIComponent(item.id)}/content`;
  const isImage = (item: LibraryItem) => item.kind === "image" || (item.mimeType || "").startsWith("image/");
  const isVideo = (item: LibraryItem) => item.kind === "video" || (item.mimeType || "").startsWith("video/");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Library & Studio"
      description="Keep your files, create images, and generate video in one workspace."
      icon={<AppIcon name="apps" size={18} />} maxWidth="4xl"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] p-1" role="tablist" aria-label="Studio workspace">
          {([{id:"library",label:"Library"},{id:"image",label:"Image generation"},{id:"video",label:"Video generation"}] as const).map((entry) => (
            <button key={entry.id} type="button" role="tab" aria-selected={tab === entry.id}
              onClick={() => { setTab(entry.id); setError(null); setNotice(null); }}
              className={`rounded-lg px-3 py-2 text-xs transition-colors ${tab === entry.id ? "bg-[var(--claude-surface)] text-[var(--claude-text)] shadow-sm" : "text-[var(--claude-text-muted)] hover:text-[var(--claude-text)]"}`}>
              {entry.label}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-500">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600">{notice}</div>}

        {tab === "library" && <>
          <input ref={uploadRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.txt,.md,.json,.csv,.docx,.xlsx,.zip,.py,.js,.ts,.tsx,.html,.css" onChange={handleUpload} aria-label="Upload file to library" />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files and generated media…" icon={<AppIcon name="search" size={13} />} /></div>
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => uploadRef.current?.click()} icon={<AppIcon name="upload" size={14} />}>{busy === "upload" ? "Uploading…" : "Upload"}</Button>
          </div>
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--claude-border)] px-5 py-12 text-center">
              <p className="text-sm text-[var(--claude-text)]">{items.length ? "No matching files" : "Your library is empty"}</p>
              <p className="mt-1 text-xs text-[var(--claude-text-muted)]">Upload a file or generate an image/video to save it here.</p>
            </div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)]">
                {isImage(item) && <img src={urlFor(item)} alt={item.name} loading="lazy" className="h-36 w-full object-cover bg-black/10" />}
                {isVideo(item) && <video src={urlFor(item)} controls preload="metadata" className="h-36 w-full bg-black object-contain" />}
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--claude-text)]" title={item.name}>{item.name}</p>
                      <p className="mt-1 text-[10px] text-[var(--claude-text-muted)]">{item.type} · {formatSize(item.size)} · {new Date(item.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button type="button" onClick={() => handleDelete(item)} aria-label={`Delete ${item.name}`} title="Delete from library" className="rounded-md px-2 py-1 text-xs text-[var(--claude-text-muted)] hover:bg-rose-500/10 hover:text-rose-500">Delete</button>
                  </div>
                  {!isImage(item) && !isVideo(item) && item.contentSnippet && <p className="mt-2 line-clamp-2 text-[11px] text-[var(--claude-text-muted)]">{item.contentSnippet}</p>}
                  <a href={urlFor(item)} download={item.name} className="mt-3 inline-block text-[11px] text-[var(--claude-text-secondary)] underline underline-offset-2 hover:text-[var(--claude-text)]">Download / open</a>
                </div>
              </article>)}
            </div>}
          </div>
        </>}

        {tab === "image" && <div className="space-y-4">
          <div><h3 className="text-sm font-medium text-[var(--claude-text)]">Image generation</h3><p className="mt-1 text-xs leading-5 text-[var(--claude-text-muted)]">Describe the image you want. Generated images are saved to the Library.</p></div>
          <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} maxLength={3000} rows={5} placeholder="A cinematic wide shot of a futuristic city in monsoon rain, warm windows, realistic lighting…" className="w-full resize-y rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] p-3 text-sm text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-[var(--claude-text-muted)]">{imagePrompt.length}/3000 characters · Requires GEMINI_API_KEY</span><Button variant="primary" disabled={!imagePrompt.trim() || busy !== null} onClick={() => generate("image")}>{busy === "image" ? "Generating…" : "Generate image"}</Button></div>
        </div>}

        {tab === "video" && <div className="space-y-4">
          <div><h3 className="text-sm font-medium text-[var(--claude-text)]">Video generation</h3><p className="mt-1 text-xs leading-5 text-[var(--claude-text-muted)]">Describe the scene and camera movement. Generation can take several minutes; finished videos are saved to the Library.</p></div>
          <textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} maxLength={3000} rows={5} placeholder="A slow cinematic tracking shot of a red sports car on a coastal road at golden hour…" className="w-full resize-y rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] p-3 text-sm text-[var(--claude-text)] outline-none focus:border-[var(--claude-text-muted)]" />
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-[var(--claude-text-muted)]">{videoPrompt.length}/3000 characters · Requires Veo API access</span><Button variant="primary" disabled={!videoPrompt.trim() || busy !== null} onClick={() => generate("video")}>{busy === "video" ? "Generating video… please wait" : "Generate video"}</Button></div>
        </div>}
      </div>
    </Modal>
  );
};
