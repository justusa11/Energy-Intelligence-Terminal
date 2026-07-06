// Shared component for modules that are on the product roadmap but not yet
// backed by data. Renders an honest "planned" state instead of a fake demo.

export function RoadmapModule({
  title,
  description,
  planned,
}: {
  title: string;
  description: string;
  planned: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            On the roadmap
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          This module is scaffolded and routed. The following capabilities are planned:
        </p>
        <ul className="mt-4 space-y-2">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
