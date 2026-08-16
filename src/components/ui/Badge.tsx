import type { ReactNode } from "react";

type BadgeVariant = "default" | "swiss" | "live" | "gold" | "silver" | "bronze";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  swiss: "bg-swiss-100 text-swiss-800",
  live: "bg-red-100 text-red-800",
  gold: "bg-amber-100 text-amber-900",
  silver: "bg-slate-200 text-slate-800",
  bronze: "bg-orange-100 text-orange-900",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClass[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
