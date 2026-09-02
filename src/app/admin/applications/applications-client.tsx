"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Application {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  linkedinUrl?: string | null;
  status: "pending" | "accepted" | "rejected";
  submittedAt: string; // ISO string from server
  mainReason?: string[] | null;
  promptedBy?: string | null;
  motivation?: string | null;
  educationLevel?: string | null;
  careerStage?: string | null;
  occupation?: string | null;
  workArea?: string | null;
  eaBackground?: string | null;
  heardAbout?: string | null;
  availability?: unknown;
  onlinePreference?: string | null;
  language?: string | null;
  extraInfo?: string | null;
}

export default function ApplicationsClient({ apps }: { apps: Application[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<"accept" | "reject" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = apps.filter((a) => a.status === "pending");
  const handled = apps.filter((a) => a.status !== "pending");
  const allPendingIds = pending.map((a) => a.id);
  const allSelected = allPendingIds.length > 0 && allPendingIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allPendingIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: "accept" | "reject") {
    if (selected.size === 0) return;
    setBulkLoading(action);
    const ids = [...selected];
    await Promise.all(
      ids.map((id) => fetch(`/api/admin/applications/${id}/${action}`, { method: "POST" }))
    );
    setSelected(new Set());
    setBulkLoading(null);
    router.refresh();
  }

  async function singleAction(id: string, action: "accept" | "reject") {
    await fetch(`/api/admin/applications/${id}/${action}`, { method: "POST" });
    router.refresh();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  const availability = (a: Application): string => {
    if (!a.availability) return "";
    if (Array.isArray(a.availability)) return (a.availability as string[]).join(", ");
    return String(a.availability);
  };

  const onlineLabel = (v?: string | null) => {
    if (!v) return "";
    return v === "online" ? "💻 Online" : v === "in_person" ? "🏢 In person" : "🤷 No preference";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pending.length} pending · {handled.length} handled
          </p>
        </div>
        <a href="/apply" target="_blank" className="text-xs text-teal-600 hover:underline">
          Public form ↗
        </a>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pending review ({pending.length})
            </h2>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{selected.size} selected</span>
                <button
                  onClick={() => bulkAction("accept")}
                  disabled={!!bulkLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition"
                >
                  {bulkLoading === "accept" ? "Accepting…" : `Accept ${selected.size}`}
                </button>
                <button
                  onClick={() => bulkAction("reject")}
                  disabled={!!bulkLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition"
                >
                  {bulkLoading === "reject" ? "Rejecting…" : `Reject ${selected.size}`}
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Select-all header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-medium">Select all</span>
            </div>

            {/* Application rows */}
            {pending.map((app) => (
              <div key={app.id} className="border-b border-slate-50 last:border-0">
                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(app.id)}
                    onChange={() => toggleOne(app.id)}
                    className="w-4 h-4 accent-teal-600 mt-1 cursor-pointer shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800">{app.name}</p>
                      {app.language && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {app.language === "nl" ? "🇳🇱 NL" : app.language === "en" ? "🇬🇧 EN" : "🌐 both"}
                        </span>
                      )}
                      {app.onlinePreference && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {onlineLabel(app.onlinePreference)}
                        </span>
                      )}
                      {app.city && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          📍 {app.city}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{app.email}
                      {app.phone && <span className="text-slate-400"> · {app.phone}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(app.submittedAt)}
                      {app.heardAbout && ` · via ${app.heardAbout}`}
                    </p>
                    {/* Preview of main reasons */}
                    {app.mainReason && app.mainReason.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        <span className="font-medium">Reason:</span> {app.mainReason.join(" · ")}
                      </p>
                    )}
                    {app.careerStage && (
                      <p className="text-xs text-slate-400 mt-0.5">{app.careerStage} · {app.occupation ?? ""}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      className="text-xs text-slate-400 hover:text-teal-600 px-2 py-1 rounded transition"
                    >
                      {expanded === app.id ? "Hide" : "View"}
                    </button>
                    {app.linkedinUrl && (
                      <a
                        href={app.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-teal-600 hover:underline px-2 py-1 rounded transition"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                    <button
                      onClick={() => singleAction(app.id, "accept")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => singleAction(app.id, "reject")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded === app.id && (
                  <div className="px-4 pb-4 ml-7 space-y-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      {app.educationLevel && <DetailRow label="Education" value={app.educationLevel} />}
                      {app.careerStage && <DetailRow label="Career stage" value={app.careerStage} />}
                      {app.occupation && <DetailRow label="Occupation" value={app.occupation} />}
                      {app.workArea && <DetailRow label="Work area" value={app.workArea} />}
                    </div>
                    {availability(app) && (
                      <DetailRow label="Availability" value={availability(app)} />
                    )}
                    {app.promptedBy && (
                      <DetailRow label="What prompted them" value={app.promptedBy} long />
                    )}
                    {app.motivation && (
                      <DetailRow label="Long answer" value={app.motivation} long />
                    )}
                    {app.eaBackground && (
                      <DetailRow label="EA background" value={app.eaBackground} long />
                    )}
                    {app.extraInfo && (
                      <DetailRow label="Extra info" value={app.extraInfo} long />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Handled */}
      {handled.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Handled ({handled.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {handled.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{app.name}</td>
                    <td className="px-4 py-3 text-slate-500">{app.email}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{app.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          app.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(app.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {apps.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No applications yet.</p>
          <a href="/apply" target="_blank" className="mt-2 inline-block text-teal-600 text-sm underline">
            Share the application form
          </a>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={long ? "" : "flex gap-3"}>
      <span className="shrink-0 text-xs font-medium text-slate-400 w-32">{label}</span>
      <span className={`text-xs text-slate-600 ${long ? "mt-0.5 block whitespace-pre-wrap" : ""}`}>{value}</span>
    </div>
  );
}
