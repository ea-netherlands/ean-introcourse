"use client";

/**
 * Discussion under a lesson, shared by the whole cohort. Top-level comments
 * with one level of replies. Authors can delete their own comments;
 * facilitators can delete any comment in their cohort.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Comment {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null; role: string };
  canDelete: boolean;
}

type Reason = "signed_out" | "pending" | "no_group";

const MAX = 4000;

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: "var(--color-ea-teal)" }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await onSubmit(text.trim());
    setBusy(false);
    if (ok) setText("");
  }
  return (
    <div className="space-y-2">
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
        }}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
        style={{ background: "var(--bg-page)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs" style={{ color: "var(--text-muted)" }}>Ctrl+Enter to post</span>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-pill btn-pill-secondary h-8 px-3 text-xs">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          className="btn-pill btn-pill-primary h-8 px-3.5 text-xs disabled:opacity-50"
        >
          {busy ? "Posting…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

export function LessonComments({ lessonId }: { lessonId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [cohort, setCohort] = useState<string>("");
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/comments`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setComments(data.comments ?? []);
    setReason(data.reason ?? null);
    setCohort(data.cohort ?? "");
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  async function post(content: string, parentId?: string) {
    setError("");
    const res = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not post your comment.");
      return false;
    }
    setReplyTo(null);
    await load();
    return true;
  }

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/lessons/${lessonId}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) setError("Could not delete that comment.");
    setConfirmDelete(null);
    await load();
  }

  const topLevel = (comments ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (comments ?? []).filter((c) => c.parentId === id);

  function CommentItem({ c, isReply }: { c: Comment; isReply?: boolean }) {
    return (
      <div className="flex gap-3">
        <Avatar name={c.author.name} url={c.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{c.author.name}</span>
            {c.author.role === "facilitator" && <span className="badge-ean !min-h-0 !px-2 !text-[11px]">Facilitator</span>}
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {c.content}
          </p>
          <div className="mt-1.5 flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {!isReply && (
              <button type="button" className="hover:text-ea-teal" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                Reply
              </button>
            )}
            {c.canDelete &&
              (confirmDelete === c.id ? (
                <span className="flex gap-2">
                  <span>Delete this comment{!isReply && repliesOf(c.id).length > 0 ? " and its replies" : ""}?</span>
                  <button type="button" className="font-semibold text-red-600" onClick={() => remove(c.id)}>Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(null)}>Keep</button>
                </span>
              ) : (
                <button type="button" className="hover:text-red-600" onClick={() => setConfirmDelete(c.id)}>Delete</button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="discussion-title" className="card-ean mx-auto w-full max-w-[52rem] px-5 py-6 sm:px-10 md:px-14 md:py-10">
      <div className="mb-5">
        <h2 id="discussion-title" className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>
          Discussion
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {cohort ? <>Shared with everyone in <strong>{cohort}</strong>, including the facilitators.</> : "Share your thoughts and questions about this lesson with your cohort."}
        </p>
      </div>

      {reason === "signed_out" && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href="/auth/login" className="font-medium text-ea-teal underline underline-offset-2">Sign in</Link> to read and join your cohort&apos;s discussion.
        </p>
      )}
      {reason === "pending" && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Finish your registration to join the discussion.</p>
      )}
      {reason === "no_group" && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You&apos;ll see your cohort&apos;s discussion once you&apos;re placed in a group.</p>
      )}

      {!reason && comments !== null && (
        <div className="space-y-6">
          <Composer placeholder="Ask a question or share a thought about this lesson…" submitLabel="Post comment" onSubmit={(t) => post(t)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {topLevel.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No comments yet. Be the first to start the discussion.</p>
          ) : (
            <ul className="space-y-5">
              {topLevel.map((c) => (
                <li key={c.id} className="space-y-3 border-t pt-5" style={{ borderColor: "var(--border)", borderTopStyle: "dashed" }}>
                  <CommentItem c={c} />
                  {(repliesOf(c.id).length > 0 || replyTo === c.id) && (
                    <div className="ml-11 space-y-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
                      {repliesOf(c.id).map((r) => <CommentItem key={r.id} c={r} isReply />)}
                      {replyTo === c.id && (
                        <Composer
                          autoFocus
                          placeholder={`Reply to ${c.author.name}…`}
                          submitLabel="Reply"
                          onSubmit={(t) => post(t, c.id)}
                          onCancel={() => setReplyTo(null)}
                        />
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {comments === null && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading comments…</p>}
    </section>
  );
}
