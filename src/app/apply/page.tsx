"use client";

import { useState } from "react";
import Link from "next/link";
import { TIMESLOTS } from "@/lib/availability";

// ── Constants matching Typeform exactly ──────────────────────────────

const MAIN_REASONS = [
  "Meet like-minded people",
  "Learn how to best use my donations to help others",
  "Learn how to best use my career to help others",
  "Learn how to best use my free time to help others",
  "Other",
];

const EDUCATION_LEVELS = [
  "Secondary education (HAVO/VWO)",
  "HBO",
  "WO (research university degree)",
  "Master's degree",
  "PhD",
  "Other",
];

const CAREER_STAGES = [
  "Bachelor's or Master's student",
  "PhD student",
  "Fewer than 2 years of work experience",
  "2–10 years of work experience",
  "11–20 years of work experience",
  "20+ years of work experience",
];

const OCCUPATIONS = [
  "Employed in non-profit/NGO/philanthropic work",
  "Academic/researcher/lecturer",
  "Self-employed or entrepreneur",
  "Healthcare/medical professional",
  "Employed in government or public sector",
  "Retired",
  "Employed in the private sector",
  "Currently unemployed/in between jobs",
  "Other",
];

const WORK_AREAS = [
  "Technical ML/AI research & engineering",
  "Leadership & organisational strategy",
  "Comms strategy/marketing/digital outreach",
  "Government & policy",
  "Public communication & media",
  "Entrepreneurship/founding & scaling organisations",
  "People & project management/operations",
  "Other",
];

// Shown instead of occupation/work-area for students & PhD students
const STUDY_FIELDS = [
  "Philosophy / Ethics",
  "Economics / Business",
  "Computer science / AI / Data science",
  "Mathematics / Statistics",
  "Natural sciences (biology, chemistry, physics…)",
  "Engineering / Technology",
  "Medicine / Health sciences / Public health",
  "Social sciences (sociology, political science, psychology…)",
  "Law / Legal studies",
  "Environmental sciences / Climate",
  "Humanities (history, languages, literature…)",
  "Other",
];

const HEARD_ABOUT_OPTIONS = [
  "WhatsApp groups",
  "Facebook",
  "LinkedIn",
  "My local EA group",
  "The EA Netherlands website",
  "Instagram",
  "A friend",
  "An EA(N) event",
  "An email newsletter",
  "A personal email",
  "Advert on social media",
  "Other",
];

const TOTAL_STEPS = 4;

export default function ApplyPage() {
  const [step, setStep] = useState(1);

  // Step 1 — Why join
  const [mainReason, setMainReason] = useState<string[]>([]);
  const [mainReasonOther, setMainReasonOther] = useState("");
  const [promptedBy, setPromptedBy] = useState("");

  // Step 2 — Background
  const [educationLevel, setEducationLevel] = useState("");
  const [educationLevelOther, setEducationLevelOther] = useState("");
  const [careerStage, setCareerStage] = useState("");
  const [occupation, setOccupation] = useState("");
  const [occupationOther, setOccupationOther] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [workAreaOther, setWorkAreaOther] = useState("");
  // Shown instead of occupation/workArea when careerStage is student/PhD
  const [studyField, setStudyField] = useState("");
  const [studyFieldOther, setStudyFieldOther] = useState("");
  const [motivation, setMotivation] = useState("");

  // Whether the respondent is a student (drives branching in step 2)
  const isStudent =
    careerStage === "Bachelor's or Master's student" ||
    careerStage === "PhD student";

  // Step 3 — Schedule
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [availabilityOther, setAvailabilityOther] = useState("");
  const [onlinePreference, setOnlinePreference] = useState("");

  // Step 4 — Details & consent
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [city, setCity] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [heardAboutOther, setHeardAboutOther] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggleMainReason(opt: string) {
    setMainReason((prev) => {
      if (prev.includes(opt)) return prev.filter((r) => r !== opt);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, opt];
    });
  }

  function toggleSlot(val: string) {
    setAvailability((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }

  function canAdvance() {
    if (step === 1) return mainReason.length >= 1 && promptedBy.trim().length >= 10;
    if (step === 2)
      return (
        educationLevel.length > 0 &&
        careerStage.length > 0 &&
        (isStudent ? studyField.length > 0 : occupation.length > 0 && workArea.length > 0) &&
        motivation.trim().length >= 50
      );
    if (step === 3)
      return language.length > 0 && availability.length > 0 && onlinePreference.length > 0;
    return true;
  }

  /** Resolve "Other" selections to include the custom typed value */
  function resolveOther(value: string, customText: string) {
    return value === "Other" && customText.trim() ? `Other: ${customText.trim()}` : value;
  }
  function resolveOtherArray(values: string[], customText: string) {
    return values.map((v) => (v === "Other" && customText.trim() ? `Other: ${customText.trim()}` : v));
  }
  function resolveOtherSlots(values: string[], customText: string) {
    return values.map((v) => (v === "other" && customText.trim() ? `other: ${customText.trim()}` : v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!privacyConsent) {
      setErrorMsg("Please accept the privacy policy to continue.");
      return;
    }
    setStatus("sending");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        city: city.trim() || null,
        mainReason: resolveOtherArray(mainReason, mainReasonOther),
        promptedBy: promptedBy.trim(),
        motivation: motivation.trim(),
        educationLevel: resolveOther(educationLevel, educationLevelOther),
        careerStage,
        occupation: isStudent ? null : resolveOther(occupation, occupationOther),
        workArea: isStudent ? null : resolveOther(workArea, workAreaOther),
        studyField: isStudent ? resolveOther(studyField, studyFieldOther) : null,
        language,
        availability: resolveOtherSlots(availability, availabilityOther),
        onlinePreference,
        heardAbout: resolveOther(heardAbout, heardAboutOther) || null,
        privacyConsent,
      }),
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  // ── Success screen ─────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            Application received!
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Thank you, {name.split(" ")[0]}! We&apos;ve received your application and will be in touch soon.
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Questions? Email us at{" "}
            <a href="mailto:programmes@effectiefaltruisme.nl" className="text-ea-teal underline">
              programmes@effectiefaltruisme.nl
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-ea-teal text-2xl font-bold">◆</span>
            <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>EA Netherlands Fellowship</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            Sign up for the Intro Fellowship
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            5 weeks · weekly 75-minute online discussions · about 3.5 hours of prep a week · free
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i < step ? "var(--color-ea-teal)" : "var(--border)" }}
            />
          ))}
        </div>

        <form onSubmit={submit}>
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >

            {/* ── Step 1: Why join ─────────────────────────────────── */}
            {step === 1 && (
              <>
                <StepTitle step={1} total={TOTAL_STEPS} title="Why do you want to join?" />

                <Field label="What's your main reason for signing up?" required hint="Choose 1–2">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {MAIN_REASONS.map((opt) => (
                      <ToggleChip
                        key={opt}
                        selected={mainReason.includes(opt)}
                        disabled={mainReason.length >= 2 && !mainReason.includes(opt)}
                        onClick={() => toggleMainReason(opt)}
                      >
                        {opt}
                      </ToggleChip>
                    ))}
                  </div>
                  {mainReason.includes("Other") && (
                    <input
                      type="text"
                      value={mainReasonOther}
                      onChange={(e) => setMainReasonOther(e.target.value)}
                      placeholder="Please describe your reason…"
                      autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                    />
                  )}
                </Field>

                <Field label="What prompted you to sign up for this course?" required hint="1–2 sentences">
                  <textarea
                    rows={3}
                    value={promptedBy}
                    onChange={(e) => setPromptedBy(e.target.value)}
                    placeholder="e.g. A friend recommended it, or I came across EA online and wanted to learn more…"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors resize-none"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </Field>
              </>
            )}

            {/* ── Step 2: Background ───────────────────────────────── */}
            {step === 2 && (
              <>
                <StepTitle step={2} total={TOTAL_STEPS} title="Your background" />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  We use this to form balanced groups and tailor materials.
                </p>

                <Field label="What is the highest level of education you have completed?" required>
                  <div className="space-y-2 mt-1">
                    {EDUCATION_LEVELS.map((opt) => (
                      <RadioRow key={opt} selected={educationLevel === opt} onClick={() => setEducationLevel(opt)}>
                        {opt}
                      </RadioRow>
                    ))}
                  </div>
                  {educationLevel === "Other" && (
                    <input
                      type="text"
                      value={educationLevelOther}
                      onChange={(e) => setEducationLevelOther(e.target.value)}
                      placeholder="Please describe your education level…"
                      autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                    />
                  )}
                </Field>

                <Field label="What career stage are you in?" required>
                  <div className="space-y-2 mt-1">
                    {CAREER_STAGES.map((opt) => (
                      <RadioRow key={opt} selected={careerStage === opt} onClick={() => setCareerStage(opt)}>
                        {opt}
                      </RadioRow>
                    ))}
                  </div>
                </Field>

                {/* ── Student branch: field of study ── */}
                {isStudent ? (
                  <Field
                    label={careerStage === "PhD student" ? "What field do you research?" : "What field do you study?"}
                    required
                  >
                    <div className="space-y-2 mt-1">
                      {STUDY_FIELDS.map((opt) => (
                        <RadioRow key={opt} selected={studyField === opt} onClick={() => setStudyField(opt)}>
                          {opt}
                        </RadioRow>
                      ))}
                    </div>
                    {studyField === "Other" && (
                      <input
                        type="text"
                        value={studyFieldOther}
                        onChange={(e) => setStudyFieldOther(e.target.value)}
                        placeholder="Please describe your field…"
                        autoFocus
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                        style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                      />
                    )}
                  </Field>
                ) : (
                  <>
                    <Field label="What is your current occupation?" required>
                      <div className="space-y-2 mt-1">
                        {OCCUPATIONS.map((opt) => (
                          <RadioRow key={opt} selected={occupation === opt} onClick={() => setOccupation(opt)}>
                            {opt}
                          </RadioRow>
                        ))}
                      </div>
                      {occupation === "Other" && (
                        <input
                          type="text"
                          value={occupationOther}
                          onChange={(e) => setOccupationOther(e.target.value)}
                          placeholder="Please describe your occupation…"
                          autoFocus
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                          style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                        />
                      )}
                    </Field>

                    <Field label="Which area best matches the work you spend most time on?" required>
                      <div className="space-y-2 mt-1">
                        {WORK_AREAS.map((opt) => (
                          <RadioRow key={opt} selected={workArea === opt} onClick={() => setWorkArea(opt)}>
                            {opt}
                          </RadioRow>
                        ))}
                      </div>
                      {workArea === "Other" && (
                        <input
                          type="text"
                          value={workAreaOther}
                          onChange={(e) => setWorkAreaOther(e.target.value)}
                          placeholder="Please describe your work area…"
                          autoFocus
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                          style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                        />
                      )}
                    </Field>
                  </>
                )}

                <Field
                  label="Tell us about a time you thought hard about how to get the most out of limited time, money, or effort."
                  required
                  hint="Around 120 words"
                >
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                    It doesn&apos;t need to be impressive. It might be how you chose between two jobs, decided what to prioritise at work, or picked what to study. We&apos;re more interested in HOW you decided than in what you decided.
                  </p>
                  <textarea
                    rows={5}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Type your answer here…"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors resize-none"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  <p className="text-xs mt-1" style={{ color: motivation.split(/\s+/).filter(Boolean).length < 10 ? "#ef4444" : "var(--text-muted)" }}>
                    {motivation.split(/\s+/).filter(Boolean).length} words (min. 10)
                  </p>
                </Field>
              </>
            )}

            {/* ── Step 3: Schedule ─────────────────────────────────── */}
            {step === 3 && (
              <>
                <StepTitle step={3} total={TOTAL_STEPS} title="Schedule & preferences" />

                <Field label="In what language do you want to follow the course?" required>
                  <div className="flex gap-3 mt-1">
                    {[
                      { value: "nl", label: "🇳🇱 Dutch" },
                      { value: "en", label: "🇬🇧 English" },
                      { value: "both", label: "🌐 Both are fine" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLanguage(value)}
                        className="flex-1 py-2.5 rounded-xl text-sm transition-colors border font-medium"
                        style={{
                          background: language === value ? "rgba(22,135,156,0.12)" : "var(--bg-hover)",
                          borderColor: language === value ? "var(--color-ea-teal)" : "var(--border)",
                          color: language === value ? "var(--color-ea-teal)" : "var(--text-secondary)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Which time slots work for you?" required hint="Select all that apply">
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    We recommend reserving these in your calendar now. We&apos;ll confirm 2–3 weeks before the course starts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TIMESLOTS.map(({ value, label }) => (
                      <ToggleChip
                        key={value}
                        selected={availability.includes(value)}
                        onClick={() => toggleSlot(value)}
                      >
                        {label}
                      </ToggleChip>
                    ))}
                  </div>
                  {availability.includes("other") && (
                    <input
                      type="text"
                      value={availabilityOther}
                      onChange={(e) => setAvailabilityOther(e.target.value)}
                      placeholder="Which time works for you? (e.g. Wednesday 18:00)"
                      autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                    />
                  )}
                </Field>

                <Field label="Do you prefer sessions online or in person?" required>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    Most sessions take place online. Depending on interest, we may host groups in our Amsterdam office.
                  </p>
                  <div className="flex gap-3">
                    {[
                      { value: "online", label: "💻 Online" },
                      { value: "in_person", label: "🏢 In person" },
                      { value: "no_preference", label: "🤷 No preference" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOnlinePreference(value)}
                        className="flex-1 py-2.5 rounded-xl text-sm transition-colors border font-medium"
                        style={{
                          background: onlinePreference === value ? "rgba(22,135,156,0.12)" : "var(--bg-hover)",
                          borderColor: onlinePreference === value ? "var(--color-ea-teal)" : "var(--border)",
                          color: onlinePreference === value ? "var(--color-ea-teal)" : "var(--text-secondary)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* ── Step 4: Details & consent ────────────────────────── */}
            {step === 4 && (
              <>
                <StepTitle step={4} total={TOTAL_STEPS} title="Your details" />

                <Field label="Full name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </Field>

                <Field label="Email address" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone number" required>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="06 12345678"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    />
                  </Field>
                  <Field label="Closest city" required>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      placeholder="Amsterdam"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    />
                  </Field>
                </div>

                <Field label="LinkedIn or résumé link" hint="Optional — helps us learn about your background">
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </Field>

                <Field label="How did you hear about this course?">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {HEARD_ABOUT_OPTIONS.map((opt) => (
                      <ToggleChip
                        key={opt}
                        selected={heardAbout === opt}
                        onClick={() => setHeardAbout(heardAbout === opt ? "" : opt)}
                      >
                        {opt}
                      </ToggleChip>
                    ))}
                  </div>
                  {heardAbout === "Other" && (
                    <input
                      type="text"
                      value={heardAboutOther}
                      onChange={(e) => setHeardAboutOther(e.target.value)}
                      placeholder="How did you hear about us?"
                      autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mt-2"
                      style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
                    />
                  )}
                </Field>

                {/* Privacy consent */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-ea-teal shrink-0"
                    />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      I hereby grant EAN consent for the use of my personal data as described in the{" "}
                      <a href="https://effectiefaltruisme.nl/privacy" target="_blank" rel="noreferrer" className="text-ea-teal underline">
                        privacy policy
                      </a>
                      . I am aware that I have the right to withdraw my consent at any moment.{" "}
                      <span style={{ color: "var(--color-ea-teal)" }}>*</span>
                    </span>
                  </label>
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-500">{errorMsg}</p>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--bg-card)" }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => { if (canAdvance()) setStep((s) => s + 1); }}
                disabled={!canAdvance()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-colors"
                style={{ background: "var(--color-ea-teal)" }}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={status === "sending" || !privacyConsent}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: "var(--color-ea-teal)" }}
              >
                {status === "sending" ? "Submitting…" : "Submit application ✓"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function StepTitle({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="mb-1">
      <p className="text-xs font-medium mb-0.5" style={{ color: "var(--color-ea-teal)" }}>
        Step {step} of {total}
      </p>
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
        {required && <span className="ml-1" style={{ color: "var(--color-ea-teal)" }}>*</span>}
        {hint && <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--text-muted)" }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function RadioRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border"
      style={{
        background: selected ? "rgba(22,135,156,0.1)" : "var(--bg-hover)",
        borderColor: selected ? "var(--color-ea-teal)" : "var(--border)",
        color: selected ? "var(--color-ea-teal)" : "var(--text-primary)",
      }}
    >
      <span className="mr-2">{selected ? "●" : "○"}</span>
      {children}
    </button>
  );
}

function ToggleChip({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-sm transition-colors border"
      style={{
        background: selected ? "rgba(22,135,156,0.12)" : "var(--bg-hover)",
        borderColor: selected ? "var(--color-ea-teal)" : "var(--border)",
        color: selected ? "var(--color-ea-teal)" : "var(--text-secondary)",
        opacity: disabled ? 0.4 : 1,
        fontWeight: selected ? 500 : 400,
      }}
    >
      {selected && "✓ "}{children}
    </button>
  );
}
