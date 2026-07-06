"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { AdvisorAnswer } from "@/types/terminal";

type Message = { role: "user" | "advisor"; text: string; sources?: string[] };

export default function AdvisorPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ questions: string[] }>("/advisor/suggested-questions")
      .then((r) => setSuggested(r.questions))
      .catch(() => setSuggested([]));
  }, []);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const answer = await apiPost<AdvisorAnswer>("/advisor/ask", {
        question: q,
        country,
        zone,
      });
      setMessages((m) => [
        ...m,
        { role: "advisor", text: answer.answer, sources: answer.sources },
      ]);
      if (answer.suggested_questions?.length) {
        setSuggested(answer.suggested_questions);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "advisor",
          text: err instanceof Error ? err.message : "Request failed.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Advisor</h1>
          <p className="mt-2 text-sm text-slate-400">
            Ask about prices, forecasts, savings, and risk. Answers are composed from
            live platform data.
          </p>
        </div>
        <ZoneSelect
          zone={zone}
          onChange={(z, c) => {
            setZone(z);
            setCountry(c);
          }}
        />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="min-h-[18rem] space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Ask a question below, or pick a suggested one to get started.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl p-4 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-blue-600/20 text-blue-100"
                  : "bg-slate-950 text-slate-200"
              }`}
            >
              <p className="leading-6">{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Sources: {m.sources.join(", ")}
                </p>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Advisor is thinking...</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. When is electricity cheapest today?"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => ask(question)}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </section>

      {suggested.length > 0 && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:border-blue-500 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
