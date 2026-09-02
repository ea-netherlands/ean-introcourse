/**
 * Shared UI primitives — small composable building blocks used across the app.
 * Keep this file focused: larger components live in their own files.
 */
import type { ReactNode } from "react";

// ---------- Card ----------

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 card-lip ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- Badge ----------

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "teal";
}) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    teal: "bg-teal-50 text-teal-700",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

// ---------- Button ----------

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2" };
  const variants = {
    primary: "btn-key bg-teal-600 hover:bg-teal-700 text-white",
    secondary: "btn-key-subtle border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-600",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Spinner ----------

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
