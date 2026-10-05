import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { PageShell } from "@/components/programs/SiteHeader";
import { TYPE_LABEL } from "@/components/programs/format";

const TABS = [{ key: "UPCOMING", label: "Upcoming" }, { key: "ONGOING", label: "Ongoing" }, { key: "COMPLETED", label: "Completed" }] as const;

export default function Programs() {
  usePageMeta({ title: "Programs — THE NEXT MIND", description: "Webinars, workshops, courses and challenges for students and young creatives exploring technology, AI and creativity." });
  const query = trpc.public.programs.useQuery();
  const featured = trpc.public.siteSettings.useQuery().data?.featuredProgram;
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("UPCOMING");
  const [type, setType] = useState("ALL");
  const all = query.data ?? [];
  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.key, all.filter(p => p.status === t.key).length])), [all]);
  const types = useMemo(() => Array.from(new Set(all.map(p => p.type))), [all]);
  const visible = useMemo(() => {
    const rows = all.filter(p => p.status === tab && (type === "ALL" || p.type === type));
    const time = (d: Date | null) => (d ? new Date(d).getTime() : Number.MAX_SAFE_INTEGER);
    return rows.sort((a, b) => tab === "COMPLETED" ? time(b.startAt) - time(a.startAt) : time(a.startAt) - time(b.startAt));
  }, [all, tab, type]);

  return (
    <PageShell>
      <section className="py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Programs</h1>
        <p className="mt-3 max-w-xl text-slate-300">Webinars, workshops and challenges for students and young creatives. Select one or more programs to register.</p>
        {!query.isLoading && !query.error && all.every(p => !p.registrationOpen) && <p role="status" className="mt-5 max-w-xl rounded-xl border border-yellow-300/25 bg-yellow-300/5 px-4 py-3 text-sm text-yellow-100">Registration is currently unavailable — no programs are open right now.</p>}
        {featured && featured.status !== "COMPLETED" && <div className="mt-8"><div className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Featured</div><ProgramCard program={featured} /></div>}
        <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${tab === t.key ? "border-yellow-300 bg-yellow-300 text-slate-950" : "border-white/15 text-slate-300 hover:border-white/40"}`}>
              {t.label} <span className="opacity-60">{counts[t.key] ?? 0}</span>
            </button>
          ))}
          {types.length > 1 && (
            <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type" className="ml-auto rounded-full border border-white/15 bg-[#101827] px-4 py-2 text-sm text-slate-200">
              <option value="ALL">All types</option>
              {types.map(t => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
            </select>
          )}
        </div>
        <div className="mt-8">
          {query.isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-yellow-200" /></div>
            : query.error ? <p className="py-16 text-center text-slate-400">{/out of date/.test(query.error.message) ? query.error.message : "Couldn't load programs. Please refresh."}</p>
            : visible.length === 0 ? <p className="py-16 text-center text-slate-400">Nothing here yet — check back soon.</p>
            : <div className="grid gap-5 sm:grid-cols-2">{visible.map(p => <ProgramCard key={p.id} program={p} />)}</div>}
        </div>
      </section>
    </PageShell>
  );
}
