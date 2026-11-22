"use client";

/**
 * Channel list for /chat. Switching loads the other channel on the server; while that
 * happens the clicked channel shows a spinner and the chat area is dimmed (via the
 * data-pending attribute on <body>), so it's clear something is happening.
 */
import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export interface Channel { key: string; label: string; href: string }

export function ChannelList({ channels, active }: { channels: Channel[]; active: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    document.body.dataset.chatPending = pending ? "1" : "";
    if (!pending) setTarget(null);
  }, [pending]);

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:space-y-0.5 sm:overflow-visible">
      {channels.map((c) => {
        const isActive = c.key === active && !pending;
        const loading = pending && target === c.key;
        return (
          <a
            key={c.key}
            href={c.href}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              if (c.key === active) return;
              setTarget(c.key);
              startTransition(() => router.push(c.href));
            }}
            aria-current={c.key === active ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: isActive || loading ? "rgba(22,135,156,0.1)" : "transparent",
              color: isActive || loading ? "var(--color-ea-teal)" : "var(--text-secondary)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            <span className="truncate">{c.label}</span>
            {loading && (
              <span
                aria-label="Loading"
                className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            )}
          </a>
        );
      })}
    </nav>
  );
}
