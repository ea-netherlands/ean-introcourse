"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  groupId: string;
  myName: string;
}

export default function NewPostForm({ groupId, myName }: Props) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/group/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to post");
        return;
      }
      setContent("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
        NEW POST
      </h2>
      <form onSubmit={handleSubmit}>
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <textarea
            ref={ref}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                if (content.trim() && !sending) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            rows={3}
            placeholder={`Share something with your group, ${myName.split(" ")[0]}…`}
            className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ctrl+Enter to post
            </span>
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ background: "var(--color-ea-teal)" }}
            >
              {sending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
