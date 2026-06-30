"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems, secondaryNavItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
          <Zap className="h-6 w-6" />
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            FlexTrade AI
          </h1>
          <p className="text-xs text-slate-400">
            Energy Intelligence Terminal
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">System Status</p>
          <p className="mt-1 text-sm font-medium text-green-400">
            Operational
          </p>
        </div>
      </div>
    </aside>
  );
}