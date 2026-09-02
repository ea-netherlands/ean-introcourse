"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

interface Props {
  initialPosts: Post[];
  channel: "general" | "group";
  groupId: string | null;
  myId: string;
  myName: string;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatClient({ initialPosts, channel, groupId, myId, myName }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll to bottom when posts change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const fetchPosts = async () => {
      const url = channel === "general"
        ? "/api/chat/general"
        : `/api/chat/group/${groupId}`;
      const res = await fetch(url).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      setPosts(data.posts ?? []);
    };
    const id = setInterval(fetchPosts, 10_000);
    return () => clearInterval(id);
  }, [channel, groupId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    const url = channel === "general" ? "/api/chat/general" : `/api/chat/group/${groupId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setContent("");
      router.refresh();
      // Also update locally for instant feedback
      const data = await res.json().catch(() => null);
      if (data?.post) setPosts((prev) => [...prev, data.post]);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {posts.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
            No messages yet. Start the conversation!
          </p>
        )}
        {posts.map((p) => {
          const isMe = p.authorId === myId;
          return (
            <div key={p.id} className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                style={{ background: isMe ? "var(--color-ea-teal)" : "#64748b" }}
              >
                {initials(p.authorName)}
              </span>
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {isMe ? "You" : p.authorName} · {fmt(p.createdAt)}
                </span>
                <div
                  className="rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: isMe ? "var(--color-ea-teal)" : "var(--bg-hover)",
                    color: isMe ? "#fff" : "var(--text-primary)",
                  }}
                >
                  {p.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="p-3 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${channel === "general" ? "everyone" : "your group"}…`}
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition"
          style={{ background: "var(--color-ea-teal)" }}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
