"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReplyForm({ postId, groupId }: { postId: string; groupId: string }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/group/${groupId}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 ml-11 flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Reply… (Enter to send)"
        className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
        style={{
          background: "var(--bg-hover)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <button
        type="submit"
        disabled={sending || !content.trim()}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
        style={{ background: "var(--color-ea-teal)" }}
      >
        {sending ? "…" : "Reply"}
      </button>
    </form>
  );
}
