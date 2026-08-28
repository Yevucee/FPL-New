"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { leagueConfig } from "@/lib/leagueConfig";

const navItems = [
  { href: "/league", label: "Standings" },
  { href: "/planner", label: "Planner" },
  { href: "/league/rivalry", label: "Rivalry" },
  { href: "/history", label: "History" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/league") {
    return pathname === "/league" || pathname === "/";
  }
  if (href === "/league/rivalry") {
    return pathname.startsWith("/league/rivalry");
  }
  if (href === "/planner") {
    return pathname.startsWith("/planner");
  }
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/league" className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
            priority
          />
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-900">
              {leagueConfig.displayName}
            </span>
            <span className="block text-xs font-medium text-slate-500">
              {leagueConfig.shortName} · private league
            </span>
          </div>
        </Link>
        <nav className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  active
                    ? "bg-white text-swiss-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
