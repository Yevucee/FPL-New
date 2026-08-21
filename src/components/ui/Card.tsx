import type { ReactNode } from "react";

import { TooltipLabel } from "./TooltipLabel";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingClass = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-sm ${paddingClass[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  const label = (
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {hint ? <TooltipLabel hint={hint}>{children}</TooltipLabel> : children}
    </p>
  );
  return label;
}
