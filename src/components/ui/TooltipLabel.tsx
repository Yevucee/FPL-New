import type { ReactNode } from "react";

interface TooltipLabelProps {
  children: ReactNode;
  hint: string;
  className?: string;
}

/** One-line explanation shown on hover. */
export function TooltipLabel({ children, hint, className = "" }: TooltipLabelProps) {
  return (
    <span className={`group/tip relative inline-block cursor-help ${className}`}>
      <span className="border-b border-dotted border-slate-300/80">{children}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-30 hidden w-max max-w-[260px] rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-lg group-hover/tip:block"
      >
        {hint}
      </span>
    </span>
  );
}
