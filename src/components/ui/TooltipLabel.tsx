"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipLabelProps {
  children: ReactNode;
  hint: string;
  className?: string;
}

type TooltipPlacement = "above" | "below";

/** One-line explanation shown on hover — rendered in a portal so it is not clipped by cards/grids. */
export function TooltipLabel({ children, hint, className = "" }: TooltipLabelProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: TooltipPlacement;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 260;
    const gap = 8;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - tooltipWidth - 8,
    );
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: TooltipPlacement =
      spaceAbove >= 48 || spaceAbove > spaceBelow ? "above" : "below";
    const top = placement === "above" ? rect.top - gap : rect.bottom + gap;
    setPosition({ top, left, placement });
  }, []);

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  const hide = () => {
    setOpen(false);
    setPosition(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-block cursor-help border-b border-dotted border-slate-300/80 ${className}`}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open &&
        position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: position.placement === "above" ? "translateY(-100%)" : undefined,
              zIndex: 9999,
            }}
            className="pointer-events-none w-max max-w-[260px] rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-lg"
          >
            {hint}
          </span>,
          document.body,
        )}
    </>
  );
}
