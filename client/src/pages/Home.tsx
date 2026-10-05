import { trpc } from "@/lib/trpc";
import { ArrowRight, ExternalLink, Share2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { PageShell } from "@/components/programs/SiteHeader";
import { shareSite } from "@/lib/share";

const DEFAULT_SUB = "A free initiative by Coach Jam Digital Solutions, under the ambition of JAM TO THE WORLD — webinars, workshops and courses for students and young creatives, all in one place.";

export default function Home() {
  const settings = trpc.public.siteSettings.useQuery().data;
  const programs = trpc.public.programs.useQuery();
  const links = trpc.public.communityLinks.useQuery().data ?? [];
  const [shareLabel, setShareLabel] = useState("Share THE NEXT MIND");

  const showcase = useMemo(() => {
    const time = (d: Date | null) => (d ? new Date(d).getTime() : Number.MAX_SAFE_INTEGER);
    return (programs.data ?? []).filter(p => p.status !== "COMPLETED").sort((a, b) => time(a.startAt) - time(b.startAt)).slice(0, 6);
  }, [programs.data]);
  const anyOpen = showcase.some(p => p.registrationOpen);

  return (
    <PageShell>
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center py-14 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-200/10 px-3 py-1.5 text-xs text-yellow-100"><Sparkles className="h-3.5 w-3.5" /> Learn. Create. Build.</div>
        {settings?.heroHeadline
          ? <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">{settings.heroHeadline}</h1>
          : <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">Your next move<br /><span className="text-gradient">starts with AI.</span></h1>}
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">{settings?.heroSubheadline || DEFAULT_SUB}</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link href="/programs" className="inline-flex items-center gap-2 rounded-xl bg-yellow-300 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-yellow-200 active:scale-[.98]">Explore Programs <ArrowRight className="h-4 w-4" /></Link>
          <button type="button" onClick={async () => { const r = await shareSite(); if (r === "copied") { setShareLabel("Message copied"); setTimeout(() => setShareLabel("Share THE NEXT MIND"), 2500); } }} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><Share2 className="h-4 w-4" />{shareLabel}</button>
        </div>
      </section>

      <section id="programs" className="py-10">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white">Programs</h2>
            <p className="mt-2 text-slate-400">Select one or more programs to register.</p>
          </div>
          <Link href="/programs" className="text-sm text-yellow-200 hover:underline">View all programs →</Link>
        </div>
        {!programs.isLoading && !programs.error && !anyOpen && <p role="status" className="mt-5 rounded-xl border border-yellow-300/25 bg-yellow-300/5 px-4 py-3 text-sm text-yellow-100">Registration is currently unavailable — no programs are open right now.</p>}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{showcase.map(p => <ProgramCard key={p.id} program={p} />)}</div>
      </section>

      {links.length > 0 && (
        <section className="py-10">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-white">Join the community</h2>
            <p className="mt-2 max-w-xl text-slate-300">Announcements, reminders and conversations with other students and young creatives.</p>
            <div className="mt-5 flex flex-wrap gap-3">{links.map(l => <a key={l.key} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-yellow-300/50">{l.label} <ExternalLink className="h-4 w-4" /></a>)}</div>
          </div>
        </section>
      )}

      <section className="py-10">
        <div className="glass flex flex-col items-start justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
          <div><h2 className="font-display text-2xl font-semibold text-white">Partner with NEXT MIND</h2><p className="mt-2 max-w-md text-slate-300">Speak, train, sponsor or build with us.</p></div>
          <Link href="/partner" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-yellow-300/50">Become a partner</Link>
        </div>
      </section>
    </PageShell>
  );
}
