import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">FlexTrade AI</h1>
            <p className="text-sm text-slate-400">Energy Intelligence Terminal</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-slate-100">Local demo access</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                This workspace opens directly into the terminal. Production deployments
                should enable the backend token gate now and connect identity-provider
                auth before real users or sensitive data are added.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/market-cockpit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500"
        >
          Enter terminal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
