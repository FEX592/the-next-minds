import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Area, Btn, errMsg, Loading, Pick, Section, slugify, Text, Toggle } from "./ui";

export default function SiteAdmin() {
  return (
    <div className="space-y-8">
      <div><div className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Content</div><h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Site & community links</h1><p className="mt-2 text-sm text-slate-400">Featured program, homepage copy, and the WhatsApp / Telegram links used in emails and program pages.</p></div>
      <SettingsForm />
      <CommunityLinks />
    </div>
  );
}

function SettingsForm() {
  const utils = trpc.useUtils();
  const settings = trpc.admin.siteSettings.useQuery();
  const programs = trpc.admin.programs.useQuery();
  const [f, setF] = useState({ featuredProgramId: "", heroHeadline: "", heroSubheadline: "", aboutShortText: "" });
  useEffect(() => { const s = settings.data; if (s) setF({ featuredProgramId: s.featuredProgramId?.toString() ?? "", heroHeadline: s.heroHeadline ?? "", heroSubheadline: s.heroSubheadline ?? "", aboutShortText: s.aboutShortText ?? "" }); }, [settings.data]);
  const save = trpc.admin.saveSiteSettings.useMutation({ onSuccess: () => { utils.admin.siteSettings.invalidate(); utils.public.siteSettings.invalidate(); toast.success("Saved."); }, onError: e => toast.error(errMsg(e)) });
  if (settings.isLoading) return <Loading />;
  const published = (programs.data ?? []).filter(p => p.publishedAt && !p.archivedAt);
  return (
    <>
      <Section title="Homepage & featured program">
        <div className="sm:col-span-2"><Pick label="Featured program" value={f.featuredProgramId} onChange={v => setF(s => ({ ...s, featuredProgramId: v }))} options={[["", "None"], ...published.map(p => [String(p.id), p.title] as [string, string])]} /></div>
        <div className="sm:col-span-2"><Text label="Hero headline" value={f.heroHeadline} onChange={v => setF(s => ({ ...s, heroHeadline: v }))} /></div>
        <div className="sm:col-span-2"><Area label="Hero sub-headline" rows={2} value={f.heroSubheadline} onChange={v => setF(s => ({ ...s, heroSubheadline: v }))} /></div>
        <div className="sm:col-span-2"><Area label="About (short text)" rows={3} value={f.aboutShortText} onChange={v => setF(s => ({ ...s, aboutShortText: v }))} /></div>
        <div className="sm:col-span-2 flex justify-end"><Btn busy={save.isPending} onClick={() => save.mutate({ featuredProgramId: f.featuredProgramId ? Number(f.featuredProgramId) : null, heroHeadline: f.heroHeadline, heroSubheadline: f.heroSubheadline, aboutShortText: f.aboutShortText })}>Save settings</Btn></div>
      </Section>
    </>
  );
}

const blank = { key: "", label: "", platform: "whatsapp", url: "", description: "", isActive: true, displayOrder: "0" };

function CommunityLinks() {
  const utils = trpc.useUtils();
  const q = trpc.admin.communityLinks.useQuery();
  const [f, setF] = useState(blank);
  const [isNew, setIsNew] = useState(true);
  const inv = () => { utils.admin.communityLinks.invalidate(); utils.public.communityLinks.invalidate(); utils.public.program.invalidate(); };
  const save = trpc.admin.saveCommunityLink.useMutation({ onSuccess: () => { inv(); setF(blank); setIsNew(true); toast.success("Saved."); }, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deleteCommunityLink.useMutation({ onSuccess: () => { inv(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-semibold text-white">Community links</h2>
      <p className="mt-1 text-xs text-slate-500">The first active link per platform is used on program pages and in confirmation emails (unless a program overrides it).</p>
      <div className="mt-5 space-y-2">
        {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No links yet.</p> : q.data!.map(l => (
          <div key={l.key} className="flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="text-sm font-medium text-white">{l.label} <span className="text-xs uppercase text-slate-500">· {l.platform}{l.isActive ? "" : " · inactive"}</span></div><div className="truncate text-xs text-slate-500">{l.url}</div></div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => { setF({ key: l.key, label: l.label, platform: l.platform, url: l.url, description: l.description ?? "", isActive: l.isActive, displayOrder: String(l.displayOrder) }); setIsNew(false); }}>Edit</Btn>
              <Btn variant="danger" busy={remove.isPending && remove.variables?.key === l.key} onClick={() => confirm(`Delete "${l.label}"?`) && remove.mutate({ key: l.key })}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
        <h3 className="text-sm font-semibold text-slate-200 sm:col-span-2">{isNew ? "Add a link" : `Editing "${f.key}"`}</h3>
        <Text label="Label" value={f.label} onChange={v => setF(s => ({ ...s, label: v, key: isNew ? slugify(v) : s.key }))} placeholder="NEXT MIND Telegram" />
        <Pick label="Platform" value={f.platform} onChange={v => setF(s => ({ ...s, platform: v }))} options={[["whatsapp", "WhatsApp"], ["telegram", "Telegram"], ["other", "Other"]]} />
        <div className="sm:col-span-2"><Text label="URL" type="url" value={f.url} onChange={v => setF(s => ({ ...s, url: v }))} /></div>
        <Text label="Display order" type="number" value={f.displayOrder} onChange={v => setF(s => ({ ...s, displayOrder: v }))} />
        <div className="flex items-end"><Toggle label="Active" checked={f.isActive} onChange={v => setF(s => ({ ...s, isActive: v }))} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          {!isNew && <Btn variant="ghost" onClick={() => { setF(blank); setIsNew(true); }}>Cancel</Btn>}
          <Btn busy={save.isPending} disabled={!f.label.trim() || !f.url.trim() || !f.key} onClick={() => save.mutate({ key: f.key, label: f.label.trim(), platform: f.platform, url: f.url.trim(), description: f.description || undefined, isActive: f.isActive, displayOrder: Number(f.displayOrder) || 0 })}>{isNew ? "Add link" : "Save link"}</Btn>
        </div>
      </div>
    </section>
  );
}
