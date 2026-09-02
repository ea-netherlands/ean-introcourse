"use client";

/**
 * LessonProgressTracker
 *
 * Two render modes, used together in the lesson page:
 *
 *   <LessonProgressTracker lessonId={id} />           ← renders only the fixed top bar
 *   <LessonProgressTracker lessonId={id} inlineOnly /> ← renders only the inline bar + % text
 *
 * Both read from the same scroll position. Progress is stored in
 * localStorage and POSTed to /api/progress (debounced) for facilitator tracking.
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  lessonId: string;
  /** When true, renders only the inline bar (no fixed viewport bar). */
  inlineOnly?: boolean;
}

const STORAGE_KEY = (id: string) => `lesson_progress_${id}`;

// Shared state between the two instances on the same page.
// Simple module-level store — both instances read the same scroll value.
let _pct = 0;
const _listeners: Set<(pct: number) => void> = new Set();

function emitPct(v: number) {
  _pct = v;
  _listeners.forEach((fn) => fn(v));
}

export function LessonProgressTracker({ lessonId, inlineOnly = false }: Props) {
  const [pct, setPct] = useState(0);
  const [completed, setCompleted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(0);
  const initialised = useRef(false);

  // Load saved progress — also resets module-level _pct so navigating
  // between lessons via the sidebar never carries the old value forward.
  useEffect(() => {
    _pct = 0;
    setPct(0);
    setCompleted(false);
    try {
      const stored = localStorage.getItem(STORAGE_KEY(lessonId));
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) {
          _pct = val;
          setPct(val);
          if (val >= 100) setCompleted(true);
        }
      }
    } catch {}
    savedRef.current = 0;
    initialised.current = true;
  }, [lessonId]);

  // Subscribe to shared state
  useEffect(() => {
    const listener = (v: number) => {
      setPct(v);
      if (v >= 100) setCompleted(true);
    };
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const saveToApi = useCallback(
    async (progress: number, done: boolean) => {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, pct: progress, completed: done }),
        });
        savedRef.current = progress;
      } catch {}
    },
    [lessonId]
  );

  // Only the non-inline instance attaches the scroll listener
  useEffect(() => {
    if (inlineOnly) return;

    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;

      const newPct = Math.min(Math.round((scrolled / total) * 100), 100);

      if (newPct <= _pct) return; // never go back

      try { localStorage.setItem(STORAGE_KEY(lessonId), String(newPct)); } catch {}

      emitPct(newPct);

      if (newPct - savedRef.current >= 5 || newPct >= 100) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
          () => saveToApi(newPct, newPct >= 100),
          3000
        );
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inlineOnly, lessonId, saveToApi]);

  // ── Fixed viewport bar ────────────────────────────────────────────────
  if (!inlineOnly) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          zIndex: 50,
          background: "rgba(0,0,0,0.08)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: completed ? "#22c55e" : "var(--color-ea-teal)",
            transition: "width 0.4s ease, background 0.5s",
          }}
        />
      </div>
    );
  }

  // ── Inline bar below the lesson title ─────────────────────────────────
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: "5px", background: "var(--bg-card)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: completed ? "#22c55e" : "var(--color-ea-teal)",
            transition: "width 0.4s ease, background 0.5s",
            borderRadius: "9999px",
          }}
        />
      </div>
      <span
        className="text-xs font-medium tabular-nums shrink-0 w-20 text-right"
        style={{ color: completed ? "#22c55e" : "var(--text-muted)" }}
      >
        {completed ? "Complete ✓" : pct > 0 ? `${pct}% read` : "Start reading"}
      </span>
    </div>
  );
}
