"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="pl-72">
        <Topbar />
        <main className="min-h-[calc(100vh-5rem)] p-8">{children}</main>
      </div>
    </div>
  );
}
