import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp, ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ImageField from "./ImageField";
import { Area, Btn, errMsg, Loading, Pick, Section, slugify, Text, toLocalInput, Toggle } from "./ui";

const TYPES: [string, string][] = [["WEBINAR", "Webinar"], ["WORKSHOP", "Workshop"], ["COURSE", "Course"], ["CHALLENGE", "Challenge"], ["TRAINING", "Training"], ["COMMUNITY_INITIATIVE", "Community initiative"], ["OTHER", "Other"]];
const STATUSES: [string, string][] = [["UPCOMING", "Upcoming"], ["ONGOING", "Ongoing"], ["COMPLETED", "Completed"]];

export default function ProgramsAdmin() {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return editing === null ? <ProgramList onEdit={setEditing} /> : <ProgramEditor key={String(editing)} id={editing} onBack={() => setEditing(null)} />;
}

function ProgramList({ onEdit }: { onEdit: (id: number | "new") => void }) {
  const utils = trpc.useUtils();
  const q = trpc.admin.programs.useQuery();
  const done = () => utils.admin.programs.invalidate();
  const publish = trpc.admin.setProgramPublished.useMutation({ onSuccess: done, onError: e => toast.error(errMsg(e)) });
  const archive = trpc.admin.setProgramArchived.useMutation({ onSuccess: done, onError: e => toast.error(errMsg(e)) });
  const [filter, setFilter] = useState("ALL");
  const rows = (q.data ?? []).filter(p => filter === "ALL" ? !p.archivedAt : filter === "ARCHIVED" ? !!p.archivedAt : !p.archivedAt && p.status === filter);
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Content</div><h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Programs & webinars</h1><p className="mt-2 text-sm text-slate-400">Create, publish and archive everything shown on /programs.</p></div>
        <Btn onClick={() => onEdit("new")}><Plus className="h-4 w-4" /> New program</Btn>
      </div>
      <div className="mt-6 flex overflow-x-auto rounded-xl border border-white/10 bg-white/[.03] p-1 sm:w-fit">
        {[["ALL", "All"], ["UPCOMING", "Upcoming"], ["ONGOING", "Ongoing"], ["COMPLETED", "Completed"], ["ARCHIVED", "Archived"]].map(([v, l]) => <button key={v} onClick={() => setFilter(v)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${filter === v ? "bg-yellow-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>{l}</button>)}
      </div>
      <div className="mt-6 space-y-3">
        {q.isLoading ? <Loading /> : rows.length === 0 ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No programs here yet.</div> : rows.map(p => {
          const state = p.archivedAt ? "Archived" : p.publishedAt ? "Published" : "Draft";
          return (
            <div key={p.id} className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                  <span className={`rounded-full px-2.5 py-1 ${state === "Published" ? "bg-emerald-400/15 text-emerald-200" : state === "Draft" ? "bg-yellow-300/15 text-yellow-100" : "bg-white/10 text-slate-300"}`}>{state}</span>
                  <span className="text-slate-400">{TYPES.find(t => t[0] === p.type)?.[1]} · {STATUSES.find(s => s[0] === p.status)?.[1]}</span>
                </div>
                <div className="mt-2 truncate font-semibold text-white">{p.title}</div>
                <div className="truncate text-xs text-slate-500">/programs/{p.slug}{p.startAt ? ` · ${new Date(p.startAt).toLocaleString()}` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="ghost" onClick={() => onEdit(p.id)}>Edit</Btn>
                {p.publishedAt && !p.archivedAt && <a href={`/programs/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5"><ExternalLink className="h-4 w-4" /></a>}
                {!p.archivedAt && <Btn variant="ghost" busy={publish.isPending && publish.variables?.id === p.id} onClick={() => publish.mutate({ id: p.id, published: !p.publishedAt })}>{p.publishedAt ? "Unpublish" : "Publish"}</Btn>}
                <Btn variant={p.archivedAt ? "ghost" : "danger"} busy={archive.isPending && archive.variables?.id === p.id} onClick={() => archive.mutate({ id: p.id, archived: !p.archivedAt })}>{p.archivedAt ? "Restore" : "Archive"}</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const blank = { slug: "", title: "", shortDescription: "", fullDescription: "", coverImageUrl: "", type: "WEBINAR", status: "UPCOMING", startAt: "", durationMinutes: "", locationOrPlatform: "", whatParticipantsWillLearn: "", whoItsFor: "", registrationEnabled: true, registrationDeadline: "", registrationCtaLabel: "", additionalResources: "", whatsappLinkOverride: "", telegramLinkOverride: "", takeawayCourseTitle: "", takeawayCourseUrl: "", seoTitle: "", seoDescription: "", seoImageUrl: "", subtitle: "", joinLink: "", recordingUrl: "", highlights: "" };
type Form = typeof blank;
type SpeakerRow = { speakerId: number; topic: string };

function ProgramEditor({ id, onBack }: { id: number | "new"; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [pid, setPid] = useState<number | null>(id === "new" ? null : id);
  const detail = trpc.admin.program.useQuery({ id: id as number }, { enabled: id !== "new" });
  const allSpeakers = trpc.admin.speakers.useQuery();
  const [f, setF] = useState<Form>(blank);
  const [slugTouched, setSlugTouched] = useState(id !== "new");
  const [sp, setSp] = useState<SpeakerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(s => ({ ...s, [k]: v }));

  const createP = trpc.admin.createProgram.useMutation();
  const updateP = trpc.admin.updateProgram.useMutation();
  const saveWeb = trpc.admin.saveWebinarDetails.useMutation();
  const saveSp = trpc.admin.setProgramSpeakers.useMutation();

  useEffect(() => {
    const d = detail.data; if (!d) return;
    const p = d.program, w = d.webinar;
    setF({ slug: p.slug, title: p.title, shortDescription: p.shortDescription ?? "", fullDescription: p.fullDescription ?? "", coverImageUrl: p.coverImageUrl ?? "", type: p.type, status: p.status, startAt: toLocalInput(p.startAt), durationMinutes: p.durationMinutes?.toString() ?? "", locationOrPlatform: p.locationOrPlatform ?? "", whatParticipantsWillLearn: p.whatParticipantsWillLearn ?? "", whoItsFor: p.whoItsFor ?? "", registrationEnabled: p.registrationEnabled, registrationDeadline: toLocalInput(p.registrationDeadline), registrationCtaLabel: p.registrationCtaLabel ?? "", additionalResources: p.additionalResources ?? "", whatsappLinkOverride: p.whatsappLinkOverride ?? "", telegramLinkOverride: p.telegramLinkOverride ?? "", takeawayCourseTitle: p.takeawayCourseTitle ?? "", takeawayCourseUrl: p.takeawayCourseUrl ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", seoImageUrl: p.seoImageUrl ?? "", subtitle: w?.subtitle ?? "", joinLink: w?.joinLink ?? "", recordingUrl: w?.recordingUrl ?? "", highlights: w?.highlights ?? "" });
    setSp(d.speakers.map(s => ({ speakerId: s.speakerId, topic: s.topic ?? "" })));
  }, [detail.data]);

  const unpicked = useMemo(() => (allSpeakers.data ?? []).filter(s => !sp.some(x => x.speakerId === s.id)), [allSpeakers.data, sp]);
  const move = (i: number, d: -1 | 1) => setSp(rows => { const n = [...rows]; const j = i + d; if (j < 0 || j >= n.length) return rows; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    const n = (s: string) => s.trim() || null;
    const date = (s: string) => (s ? new Date(s) : null);
    const startAt = date(f.startAt), deadline = date(f.registrationDeadline);
    if ((startAt && isNaN(startAt.getTime())) || (deadline && isNaN(deadline.getTime()))) return toast.error("Check the date fields.");
    const payload = { slug: f.slug.trim(), title: f.title.trim(), shortDescription: n(f.shortDescription), fullDescription: n(f.fullDescription), coverImageUrl: n(f.coverImageUrl), type: f.type as any, status: f.status as any, startAt, durationMinutes: f.durationMinutes ? Number(f.durationMinutes) : null, locationOrPlatform: n(f.locationOrPlatform), whatParticipantsWillLearn: n(f.whatParticipantsWillLearn), whoItsFor: n(f.whoItsFor), registrationEnabled: f.registrationEnabled, registrationDeadline: deadline, registrationCtaLabel: n(f.registrationCtaLabel), additionalResources: n(f.additionalResources), whatsappLinkOverride: n(f.whatsappLinkOverride), telegramLinkOverride: n(f.telegramLinkOverride), takeawayCourseTitle: n(f.takeawayCourseTitle), takeawayCourseUrl: n(f.takeawayCourseUrl), seoTitle: n(f.seoTitle), seoDescription: n(f.seoDescription), seoImageUrl: n(f.seoImageUrl) };
    setBusy(true);
    try {
      let programId = pid;
      if (programId) await updateP.mutateAsync({ id: programId, ...payload });
      else { const row = await createP.mutateAsync(payload); programId = row.id; setPid(row.id); }
      if (f.type === "WEBINAR" || f.subtitle || f.joinLink || f.recordingUrl || f.highlights)
        await saveWeb.mutateAsync({ programId, subtitle: n(f.subtitle), joinLink: n(f.joinLink), recordingUrl: n(f.recordingUrl), highlights: n(f.highlights) });
      await saveSp.mutateAsync({ programId, speakers: sp.map((s, i) => ({ speakerId: s.speakerId, topic: s.topic.trim() || undefined, displayOrder: i })) });
      await Promise.all([utils.admin.programs.invalidate(), utils.admin.program.invalidate(), utils.public.programs.invalidate(), utils.public.program.invalidate()]);
      toast.success("Saved.");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (id !== "new" && detail.isLoading) return <Loading />;
  const isWebinar = f.type === "WEBINAR";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-white">← All programs</button>
        <Btn busy={busy} onClick={save}>Save</Btn>
      </div>
      <h1 className="font-display text-3xl font-semibold">{pid ? "Edit program" : "New program"}</h1>
      {!pid && <p className="text-sm text-slate-400">New programs are saved as drafts. Publish from the list when ready.</p>}

      <Section title="Basics">
        <Text label="Title" required value={f.title} onChange={v => { set("title", v); if (!slugTouched) set("slug", slugify(v)); }} />
        <Text label="Slug (URL)" required value={f.slug} onChange={v => { setSlugTouched(true); set("slug", v); }} hint={`/programs/${f.slug || "…"}`} />
        <Pick label="Type" value={f.type} onChange={v => set("type", v)} options={TYPES} />
        <Pick label="Status" value={f.status} onChange={v => set("status", v)} options={STATUSES} />
        <div className="sm:col-span-2"><Area label="Short description" rows={2} value={f.shortDescription} onChange={v => set("shortDescription", v)} /></div>
        <div className="sm:col-span-2"><Area label="Full description" rows={6} value={f.fullDescription} onChange={v => set("fullDescription", v)} hint="One paragraph per line break." /></div>
        <div className="sm:col-span-2"><ImageField label="Cover image" folder="programs" maxDim={1600} value={f.coverImageUrl} onChange={v => set("coverImageUrl", v)} hint="Wide images (16:9) look best. Large images are resized automatically." /></div>
      </Section>

      <Section title="Schedule">
        <Text label="Start (your local time)" type="datetime-local" value={f.startAt} onChange={v => set("startAt", v)} hint="Stored as a UTC instant; visitors see it in their own timezone." />
        <Text label="Duration (minutes)" type="number" value={f.durationMinutes} onChange={v => set("durationMinutes", v)} />
        <div className="sm:col-span-2"><Text label="Location / platform" value={f.locationOrPlatform} onChange={v => set("locationOrPlatform", v)} placeholder="Telegram (live), Zoom, Lagos…" /></div>
      </Section>

      <Section title="Content">
        <Area label="What participants will learn" value={f.whatParticipantsWillLearn} onChange={v => set("whatParticipantsWillLearn", v)} hint="One point per line." />
        <Area label="Who it's for" value={f.whoItsFor} onChange={v => set("whoItsFor", v)} />
        <div className="sm:col-span-2"><Area label="Additional resources" rows={3} value={f.additionalResources} onChange={v => set("additionalResources", v)} hint="One per line; URLs become links." /></div>
        <Text label="Follow-up course title" value={f.takeawayCourseTitle} onChange={v => set("takeawayCourseTitle", v)} />
        <Text label="Follow-up course URL" type="url" value={f.takeawayCourseUrl} onChange={v => set("takeawayCourseUrl", v)} />
      </Section>

      {isWebinar && (
        <Section title="Webinar details">
          <div className="sm:col-span-2"><Text label="Subtitle" value={f.subtitle} onChange={v => set("subtitle", v)} /></div>
          <Text label="Join link" type="url" value={f.joinLink} onChange={v => set("joinLink", v)} hint="Public only while status is Ongoing; emailed to registrants." />
          <Text label="Recording URL" type="url" value={f.recordingUrl} onChange={v => set("recordingUrl", v)} hint="Public once status is Completed." />
          <div className="sm:col-span-2"><Area label="Highlights" rows={3} value={f.highlights} onChange={v => set("highlights", v)} hint="One per line; shown on completed webinars." /></div>
        </Section>
      )}

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="font-display font-semibold text-white">Speakers</h2>
        <div className="mt-5 space-y-3">
          {sp.length === 0 && <p className="text-sm text-slate-500">No speakers added.</p>}
          {sp.map((row, i) => {
            const s = allSpeakers.data?.find(x => x.id === row.speakerId);
            return (
              <div key={row.speakerId} className="flex flex-col gap-3 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center">
                <div className="w-44 shrink-0 text-sm font-medium text-white">{s?.name ?? `Speaker #${row.speakerId}`}<div className="text-xs font-normal text-slate-500">{s?.role}</div></div>
                <input value={row.topic} onChange={e => setSp(r => r.map((x, j) => j === i ? { ...x, topic: e.target.value } : x))} placeholder="Topic / session" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#101827] px-3 py-2.5 text-sm text-white placeholder:text-slate-600" />
                <div className="flex gap-1">
                  <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded-lg p-2 hover:bg-white/10"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded-lg p-2 hover:bg-white/10"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="Remove" onClick={() => setSp(r => r.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-300 hover:bg-red-400/10"><X className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
          {unpicked.length > 0 && (
            <select value="" onChange={e => e.target.value && setSp(r => [...r, { speakerId: Number(e.target.value), topic: "" }])} className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-slate-300 sm:w-72">
              <option value="">+ Add speaker…</option>
              {unpicked.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </section>

      <Section title="Registration & community">
        <div className="sm:col-span-2"><Toggle label="Registration enabled" checked={f.registrationEnabled} onChange={v => set("registrationEnabled", v)} /></div>
        <Text label="Registration deadline (your local time)" type="datetime-local" value={f.registrationDeadline} onChange={v => set("registrationDeadline", v)} />
        <Text label="Registration button label" value={f.registrationCtaLabel} onChange={v => set("registrationCtaLabel", v)} placeholder="Register now" />
        <Text label="WhatsApp link override" type="url" value={f.whatsappLinkOverride} onChange={v => set("whatsappLinkOverride", v)} hint="Leave empty to use the site-wide link." />
        <Text label="Telegram link override" type="url" value={f.telegramLinkOverride} onChange={v => set("telegramLinkOverride", v)} hint="Leave empty to use the site-wide link." />
      </Section>

      <Section title="SEO">
        <div className="sm:col-span-2"><Text label="SEO title" value={f.seoTitle} onChange={v => set("seoTitle", v)} /></div>
        <div className="sm:col-span-2"><Area label="Meta description" rows={2} value={f.seoDescription} onChange={v => set("seoDescription", v)} /></div>
        <div className="sm:col-span-2"><ImageField label="Share image (Open Graph)" folder="seo" maxDim={1200} forceWebSafe value={f.seoImageUrl} onChange={v => set("seoImageUrl", v)} hint="Shown when the link is shared (WhatsApp, X, LinkedIn). 1200×630 is ideal. Falls back to the cover image." /></div>
      </Section>

      <div className="flex justify-end gap-3 pb-8"><Btn variant="ghost" onClick={onBack}>Close</Btn><Btn busy={busy} onClick={save}>Save</Btn></div>
    </div>
  );
}
