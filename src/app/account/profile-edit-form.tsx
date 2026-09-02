"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentName: string;
  currentBio: string | null;
  currentAvatarUrl: string | null;
}

export function ProfileEditForm({ currentName, currentBio, currentAvatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
      >
        Edit profile
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Edit profile
      </h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Bio <span className="font-normal opacity-60">(optional, max 500 chars)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="A short intro about yourself…"
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <p className="text-xs mt-0.5 text-right" style={{ color: "var(--text-muted)" }}>
            {bio.length}/500
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Profile picture URL <span className="font-normal opacity-60">(optional, https://…)</span>
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {avatarUrl && /^https?:\/\//.test(avatarUrl) && (
            <img
              src={avatarUrl}
              alt="Preview"
              className="mt-2 w-14 h-14 rounded-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
          style={{ background: "var(--color-ea-teal)" }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl text-sm transition"
          style={{ color: "var(--text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
