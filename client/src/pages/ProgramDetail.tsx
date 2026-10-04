import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { CalendarDays, Clock, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Link, useParams } from "wouter";
import { ProgramRegistration } from "@/components/programs/ProgramRegistration";
import { PageShell } from "@/components/programs/SiteHeader";
import { formatDuration, formatWhen, lines, STATUS_LABEL, STATUS_STYLE, TYPE_LABEL } from "@/components/programs/format";
import NotFound from "./NotFound";

export default function ProgramDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const query = trpc.public.program.useQuery({ slug }, { enabled: Boolean(slug) });
  const data = query.data;
  const p = data?.program;
  usePageMeta({ title: p ? p.seoTitle || `${p.title} — THE NEXT MIND` : undefined, description: p ? p.seoDescription || p.shortDescription : undefined, image: p ? p.seoImageUrl || p.coverImageUrl : undefined });

  if (query.isLoading) return <PageShell><div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-yellow-200" /></div></PageShell>;
  if (query.error) return <PageShell><p className="py-32 text-center text-slate-400">Couldn't load this program. Please refresh.</p></PageShell>;
  if (!data || !p) return <NotFound />;

  const { webinar, speakers, community } = data;
  const learn = lines(p.whatParticipantsWillLearn);
  const resources = lines(p.additionalResources);
  const highlights = lines(webinar?.highlights);

  return (
    <PageShell>
      <article className="py-8 sm:py-12">
        <Link href="/programs" className="text-sm text-slate-400 hover:text-white">← All programs</Link>
        {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="mt-5 max-h-80 w-full rounded-3xl object-cover" />}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em]">
          <span className={`rounded-full border px-2.5 py-1 ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
          <span className="text-slate-400">{TYPE_LABEL[p.type] ?? p.type}</span>
        </div>
        <h1 className="font-display mt-3 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">{p.title}</h1>
        {webinar?.subtitle && <p className="mt-3 text-lg text-slate-300">{webinar.subtitle}</p>}
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-yellow-200" />{formatWhen(p.startAt)}</li>
          {formatDuration(p.durationMinutes) && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-200" />{formatDuration(p.durationMinutes)}</li>}
          {p.locationOrPlatform && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-yellow-200" />{p.locationOrPlatform}</li>}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          {p.registrationOpen && <a href="#register" className="rounded-xl bg-yellow-300 px-5 py-3 font-semibold text-slate-950 hover:bg-yellow-200">{p.registrationCtaLabel || "Register now"}</a>}
          {webinar?.joinLink && <a href={webinar.joinLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-slate-950">Join live <ExternalLink className="h-4 w-4" /></a>}
          {webinar?.recordingUrl && <a href={webinar.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:border-white/50">Watch recording <ExternalLink className="h-4 w-4" /></a>}
        </div>

        {p.fullDescription && <div className="mt-10 max-w-2xl space-y-4 leading-7 text-slate-300">{lines(p.fullDescription).map((l, i) => <p key={i}>{l}</p>)}</div>}

        {speakers.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-white">Speakers</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {speakers.map(s => (
                <div key={s.id} className="glass rounded-2xl p-5">
                  {s.photoUrl && <img src={s.photoUrl} alt={s.name} loading="lazy" className="mb-4 h-20 w-20 rounded-full object-cover" />}
                  <div className="font-semibold text-white">{s.name}</div>
                  {s.role && <div className="text-xs font-semibold uppercase tracking-[.14em] text-yellow-200">{s.role}</div>}
                  {s.topic && <div className="mt-2 text-sm text-slate-300">{s.topic}</div>}
                  {s.bio && <p className="mt-2 text-sm leading-6 text-slate-400">{s.bio}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(learn.length > 0 || p.whoItsFor) && (
          <section className="mt-12 grid gap-8 sm:grid-cols-2">
            {learn.length > 0 && <div><h2 className="font-display text-2xl font-semibold text-white">What you'll learn</h2><ul className="mt-4 space-y-2 text-slate-300">{learn.map((l, i) => <li key={i} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-300" />{l}</li>)}</ul></div>}
            {p.whoItsFor && <div><h2 className="font-display text-2xl font-semibold text-white">Who it's for</h2><p className="mt-4 leading-7 text-slate-300">{p.whoItsFor}</p></div>}
          </section>
        )}

        {p.status === "COMPLETED" && highlights.length > 0 && (
          <section className="mt-12"><h2 className="font-display text-2xl font-semibold text-white">Highlights</h2><ul className="mt-4 space-y-2 text-slate-300">{highlights.map((l, i) => <li key={i}>• {l}</li>)}</ul></section>
        )}

        {(p.takeawayCourseTitle || resources.length > 0) && (
          <section className="mt-12 grid gap-4 sm:grid-cols-2">
            {p.takeawayCourseTitle && <div className="glass rounded-2xl p-5"><div className="text-xs font-semibold uppercase tracking-[.14em] text-yellow-200">Follow-up course</div><div className="mt-2 font-semibold text-white">{p.takeawayCourseTitle}</div>{p.takeawayCourseUrl && <a href={p.takeawayCourseUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-yellow-200 hover:underline">Learn more <ExternalLink className="h-3.5 w-3.5" /></a>}</div>}
            {resources.length > 0 && <div className="glass rounded-2xl p-5"><div className="text-xs font-semibold uppercase tracking-[.14em] text-yellow-200">Resources</div><ul className="mt-2 space-y-1 text-sm text-slate-300">{resources.map((l, i) => <li key={i}>{/^https?:\/\//.test(l) ? <a href={l} target="_blank" rel="noreferrer" className="text-yellow-200 hover:underline break-all">{l}</a> : l}</li>)}</ul></div>}
          </section>
        )}

        <section id="register" className="mt-14 scroll-mt-6 max-w-2xl">
          {p.registrationOpen ? <ProgramRegistration programId={p.id} programTitle={p.title} ctaLabel={p.registrationCtaLabel} />
            : <div className="glass rounded-3xl p-6 text-slate-300">{p.registrationClosedMessage}
                {(community.whatsapp || community.telegram) && <div className="mt-4 flex flex-wrap gap-3">{community.whatsapp && <a className="rounded-xl border border-white/15 px-4 py-2 text-white hover:border-yellow-300/50" href={community.whatsapp} target="_blank" rel="noreferrer">WhatsApp Community</a>}{community.telegram && <a className="rounded-xl border border-white/15 px-4 py-2 text-white hover:border-yellow-300/50" href={community.telegram} target="_blank" rel="noreferrer">Telegram Community</a>}</div>}
              </div>}
        </section>
      </article>
    </PageShell>
  );
}
