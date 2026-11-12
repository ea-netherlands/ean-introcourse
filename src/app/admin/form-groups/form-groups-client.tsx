"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Person {
  id: string;
  name: string;
  email: string;
  groupId: string | null;
  availability: string[];
  language?: string | null;
  onlinePreference?: string | null;
  careerStage?: string | null;
  city?: string | null;
}

interface Group {
  id: string;
  name: string;
  cohort: string;
  timing: string | null;
  active: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_TIMESLOTS = [
  { value: "monday_1730",   label: "Monday 17:30" },
  { value: "monday_1930",   label: "Monday 19:30" },
  { value: "thursday_1730", label: "Thursday 17:30" },
  { value: "thursday_1930", label: "Thursday 19:30" },
];

// Map raw availability slot values → human label. Two vocabularies exist:
// the application form uses "monday_1730" etc.; the onboarding form (which
// overwrites availability when a participant sets their password) uses
// "early_monday" / "late_monday" / "early_thursday" / "late_thursday".
const SLOT_LABELS: Record<string, string> = {
  monday_1730: "Mon 17:30", monday_1930: "Mon 19:30",
  thursday_1730: "Thu 17:30", thursday_1930: "Thu 19:30",
  early_monday: "Mon early", late_monday: "Mon late",
  early_thursday: "Thu early", late_thursday: "Thu late",
  other: "Other",
};

function slotLabel(s: string) { return SLOT_LABELS[s] ?? s; }
function timingLabel(t: string | null) {
  if (!t) return null;
  return GROUP_TIMESLOTS.find((x) => x.value === t)?.label ?? t;
}

function langBadge(l?: string | null) {
  if (!l) return null;
  return l === "nl" ? "🇳🇱 NL" : l === "en" ? "🇬🇧 EN" : "🌐 both";
}
function onlineBadge(o?: string | null) {
  if (!o) return null;
  return o === "online" ? "💻 Online" : o === "in_person" ? "🏢 In person" : "🤷 No pref";
}

// Does a participant's availability include this group's timeslot?
function isCompatible(person: Person, group: Group): boolean {
  if (!group.timing) return true; // group not yet scheduled — always compatible
  return person.availability.includes(group.timing);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormGroupsClient({
  participants, facilitators, groups: initialGroups,
}: {
  participants: Person[];
  facilitators: Person[];
  groups: Group[];
}) {
  const router = useRouter();

  // Participant → group assignments (local state; saved on "Confirm")
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of [...participants, ...facilitators]) {
      if (p.groupId) init[p.id] = p.groupId;
    }
    return init;
  });

  // Live group metadata (timing, active) — updated immediately on change
  const [groupList, setGroupList] = useState<Group[]>(initialGroups);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New-group form
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCohort, setNewCohort] = useState("");
  const [newTiming, setNewTiming] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function assign(personId: string, groupId: string) {
    setAssignments((prev) => ({ ...prev, [personId]: groupId }));
    setSaved(false);
  }

  function countInGroup(groupId: string) {
    return Object.values(assignments).filter((g) => g === groupId).length;
  }

  async function saveAssignments() {
    setSaving(true);
    await Promise.all(
      Object.entries(assignments).map(([id, groupId]) =>
        fetch(`/api/admin/participants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: groupId || null }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function updateGroupTiming(groupId: string, timing: string) {
    setGroupList((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, timing: timing || null } : g))
    );
    await fetch(`/api/admin/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timing: timing || null }),
    });
  }

  async function toggleGroupActive(group: Group) {
    const deactivating = group.active;
    if (deactivating) {
      const count = countInGroup(group.id);
      const msg = count > 0
        ? `Deactivate "${group.name}"? This will mark all ${count} participants as graduates and remove them from active status.`
        : `Deactivate "${group.name}"? The group will be archived.`;
      if (!window.confirm(msg)) return;
    }
    const newActive = !group.active;
    setGroupList((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, active: newActive } : g))
    );
    await fetch(`/api/admin/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });
    router.refresh();
  }

  async function createGroup() {
    if (!newName.trim()) return;
    setCreatingGroup(true);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), cohort: newCohort.trim(), timing: newTiming || null }),
    });
    if (res.ok) {
      const g = await res.json();
      setGroupList((prev) => [...prev, { id: g.id, name: g.name, cohort: g.cohort ?? "", timing: g.timing ?? null, active: true }]);
      setNewName(""); setNewCohort(""); setNewTiming("");
      setShowNewGroup(false);
    }
    setCreatingGroup(false);
    router.refresh();
  }

  // ── Sub-components ─────────────────────────────────────────────────────────

  function SlotPills({ slots }: { slots: string[] }) {
    if (!slots.length) return <span className="text-xs text-slate-400">No availability</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {slots.map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-teal-50 text-teal-700 border border-teal-200">
            {slotLabel(s)}
          </span>
        ))}
      </div>
    );
  }

  function InfoBadge({ children }: { children: React.ReactNode }) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-500">
        {children}
      </span>
    );
  }

  function PersonRow({
    person,
    isFacilitator,
    showSelect = true,
  }: {
    person: Person;
    isFacilitator?: boolean;
    showSelect?: boolean;
  }) {
    const activeGroups = groupList.filter((g) => g.active);
    const compatible = activeGroups.filter((g) => isCompatible(person, g));
    const incompatible = activeGroups.filter((g) => !isCompatible(person, g));

    return (
      <div className="px-3 py-2 border-b border-slate-100 last:border-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Name + role badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-slate-800">{person.name}</p>
              {isFacilitator && (
                <span className="text-[11px] text-teal-600 font-medium">facilitator</span>
              )}
            </div>

            {/* Availability slots */}
            <div className="mt-1">
              <SlotPills slots={person.availability} />
            </div>

            {/* Extended info badges */}
            {(person.city || person.language || person.onlinePreference || person.careerStage) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {person.city && <InfoBadge>📍 {person.city}</InfoBadge>}
                {langBadge(person.language) && <InfoBadge>{langBadge(person.language)!}</InfoBadge>}
                {onlineBadge(person.onlinePreference) && <InfoBadge>{onlineBadge(person.onlinePreference)!}</InfoBadge>}
                {person.careerStage && <InfoBadge>{person.careerStage}</InfoBadge>}
              </div>
            )}

            {/* Group select — shown below info when in narrow sidebar (showSelect but no flex sibling) */}
            {showSelect && isFacilitator && (
              <select
                value={assignments[person.id] ?? ""}
                onChange={(e) => assign(person.id, e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{ backgroundColor: "#fff", color: "#334155" }}
              >
                <option value="">— No group —</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Group select — shown inline for participant rows */}
          {showSelect && !isFacilitator && (
            <select
              value={assignments[person.id] ?? ""}
              onChange={(e) => assign(person.id, e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 shrink-0"
              style={{ backgroundColor: "#fff", color: "#334155", minWidth: "140px" }}
            >
              <option value="">— No group —</option>
              {compatible.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              {incompatible.length > 0 && (
                <optgroup label="— Incompatible time —">
                  {incompatible.map((g) => (
                    <option key={g.id} value={g.id} style={{ color: "#94a3b8" }}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeGroups = groupList.filter((g) => g.active);
  const inactiveGroups = groupList.filter((g) => !g.active);

  // Fill the viewport: admin navbar=56px, main py-8 top+bottom=64px → 120px total offset.
  // Inner scrolling keeps the dark body from ever showing through.
  return (
    <div style={{ height: "calc(100vh - 120px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── Page title row ──────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a", margin: 0 }}>Form Groups</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>Manage groups and assign participants based on availability.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={saveAssignments}
            disabled={saving}
            style={{ padding: "7px 16px", borderRadius: "8px", background: "#0d9488", color: "#fff", fontSize: "13px", fontWeight: 600, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save assignments"}
          </button>
          {saved && <span style={{ fontSize: "13px", color: "#16a34a" }}>✓ Saved</span>}
        </div>
      </div>

      {/* ── 3-panel layout ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>

        {/* LEFT — Facilitators sidebar */}
        <aside style={{ width: "190px", flexShrink: 0, overflowY: "auto", borderRight: "1px solid #e2e8f0", paddingRight: "16px", marginRight: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            Facilitators ({facilitators.length})
          </p>
          {facilitators.length === 0 ? (
            <p className="text-sm text-slate-400">No facilitators yet.</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {facilitators.map((f) => <PersonRow key={f.id} person={f} isFacilitator />)}
            </div>
          )}
        </aside>

        {/* RIGHT — Groups bar + Participants */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Groups bar — never scrolls */}
          <div style={{ flexShrink: 0, paddingBottom: "12px", borderBottom: "1px solid #e2e8f0", marginBottom: "14px" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Active groups ({activeGroups.length})
              </p>
              <button
                onClick={() => setShowNewGroup((v) => !v)}
                style={{ fontSize: "12px", color: "#0d9488", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
              >
                {showNewGroup ? "✕ Cancel" : "+ New group"}
              </button>
            </div>

            {/* New group form */}
            {showNewGroup && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#64748b", marginBottom: "4px" }}>Name *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Groep A 2026" autoFocus
                    style={{ borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "13px", padding: "5px 10px", width: "150px", color: "#334155", background: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#64748b", marginBottom: "4px" }}>Cohort</label>
                  <input type="text" value={newCohort} onChange={(e) => setNewCohort(e.target.value)} placeholder="Herfst 2026"
                    style={{ borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "13px", padding: "5px 10px", width: "120px", color: "#334155", background: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#64748b", marginBottom: "4px" }}>Time slot</label>
                  <select value={newTiming} onChange={(e) => setNewTiming(e.target.value)}
                    style={{ borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "13px", padding: "5px 8px", color: "#334155", background: "#fff" }}>
                    <option value="">— Not set —</option>
                    {GROUP_TIMESLOTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button onClick={createGroup} disabled={creatingGroup || !newName.trim()}
                  style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600, background: "#0d9488", color: "#fff", border: "none", cursor: "pointer", opacity: creatingGroup || !newName.trim() ? 0.5 : 1 }}>
                  {creatingGroup ? "Creating…" : "Create"}
                </button>
              </div>
            )}

            {/* Group cards — horizontal scroll, compact */}
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
              {activeGroups.length === 0 && !showNewGroup && (
                <p className="text-sm text-slate-400">No active groups yet.</p>
              )}
              {activeGroups.map((group) => (
                <div key={group.id} style={{ flexShrink: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", width: "190px" }}>
                  {/* Name + active toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{group.name}</p>
                    <button onClick={() => toggleGroupActive(group)} title="Click to deactivate"
                      style={{ marginLeft: "6px", flexShrink: 0, display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#16a34a", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    </button>
                  </div>
                  {/* Timing select */}
                  <select value={group.timing ?? ""} onChange={(e) => updateGroupTiming(group.id, e.target.value)}
                    style={{ width: "100%", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", padding: "4px 6px", color: "#334155", background: "#fff", marginBottom: "5px" }}>
                    <option value="">— Not scheduled —</option>
                    {GROUP_TIMESLOTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {/* Count + cohort */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {group.cohort && <span style={{ fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.cohort}</span>}
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#0d9488", marginLeft: "auto" }}>{countInGroup(group.id)} p.</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Inactive groups */}
            {inactiveGroups.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {inactiveGroups.map((group) => (
                  <div key={group.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 10px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#cbd5e1", display: "inline-block" }} />
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{group.name}</span>
                    {timingLabel(group.timing) && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timingLabel(group.timing)}</span>}
                    <button onClick={() => toggleGroupActive(group)} style={{ fontSize: "11px", color: "#0d9488", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reactivate</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants — scrolls internally */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              Participants ({participants.length})
            </p>
            {participants.length === 0 ? (
              <p className="text-sm text-slate-400">No active participants yet.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {participants.map((p) => <PersonRow key={p.id} person={p} />)}
              </div>
            )}
            <div style={{ height: "24px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
