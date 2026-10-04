import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ImageField from "./ImageField";
import { Area, Btn, errMsg, Loading, Text } from "./ui";

const blank = { name: "", role: "", photoUrl: "", bio: "", website: "", socialLinks: "" };

export default function SpeakersAdmin() {
  const utils = trpc.useUtils();
  const q = trpc.admin.speakers.useQuery();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank, v: string) => setF(s => ({ ...s, [k]: v }));
  const done = () => { utils.admin.speakers.invalidate(); utils.admin.program.invalidate(); utils.public.program.invalidate(); setEditing(null); toast.success("Saved."); };
  const create = trpc.admin.createSpeaker.useMutation({ onSuccess: done, onError: e => toast.error(errMsg(e)) });
  const update = trpc.admin.updateSpeaker.useMutation({ onSuccess: done, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deleteSpeaker.useMutation({ onSuccess: () => { utils.admin.speakers.invalidate(); utils.admin.program.invalidate(); utils.public.program.invalidate(); toast.success("Speaker deleted."); }, onError: e => toast.error(errMsg(e)) });

  const open = (id: number | "new") => {
    const s = id === "new" ? null : q.data?.find(x => x.id === id);
    setF(s ? { name: s.name, role: s.role ?? "", photoUrl: s.photoUrl ?? "", bio: s.bio ?? "", website: s.website ?? "", socialLinks: s.socialLinks ?? "" } : blank);
    setEditing(id);
  };
  const save = () => {
    const opt = (v: string) => v.trim() || undefined;
    // Create omits empty optionals; update sends empty strings / null so values can be cleared.
    const body = { name: f.name.trim(), role: opt(f.role), photoUrl: opt(f.photoUrl), bio: opt(f.bio), website: opt(f.website), socialLinks: opt(f.socialLinks) };
    if (editing === "new") create.mutate(body); else if (editing) update.mutate({ id: editing, name: body.name, role: f.role.trim(), bio: f.bio.trim(), socialLinks: f.socialLinks.trim(), photoUrl: f.photoUrl.trim() || null, website: f.website.trim() || null });
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Content</div><h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Speakers</h1><p className="mt-2 text-sm text-slate-400">Reusable across programs. Assign them (with a topic) inside each program.</p></div>
        <Btn onClick={() => open("new")}><Plus className="h-4 w-4" /> New speaker</Btn>
      </div>

      {editing !== null && (
        <div className="glass mt-6 rounded-2xl p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Name" required value={f.name} onChange={v => set("name", v)} />
            <Text label="Role / title" value={f.role} onChange={v => set("role", v)} placeholder="The Human" />
            <div className="sm:col-span-2"><ImageField label="Photo" folder="speakers" shape="round" maxDim={800} value={f.photoUrl} onChange={v => set("photoUrl", v)} hint="Square photos work best. Large images are resized automatically." /></div>
            <Text label="Website" type="url" value={f.website} onChange={v => set("website", v)} />
            <div className="sm:col-span-2"><Area label="Short bio" rows={3} value={f.bio} onChange={v => set("bio", v)} /></div>
            <div className="sm:col-span-2"><Area label="Social links" rows={2} value={f.socialLinks} onChange={v => set("socialLinks", v)} hint="One URL per line." /></div>
          </div>
          <div className="mt-5 flex justify-end gap-3"><Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn><Btn busy={create.isPending || update.isPending} disabled={!f.name.trim()} onClick={save}>Save speaker</Btn></div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500 sm:col-span-2">No speakers yet.</div> : q.data!.map(s => (
          <div key={s.id} className="glass flex items-center gap-4 rounded-2xl p-4">
            {s.photoUrl ? <img src={s.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 font-semibold">{s.name[0]}</div>}
            <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{s.name}</div><div className="truncate text-xs text-slate-500">{s.role}</div></div>
            <Btn variant="ghost" onClick={() => open(s.id)}>Edit</Btn>
            <Btn variant="danger" busy={remove.isPending && remove.variables?.id === s.id} onClick={() => { if (confirm(`Delete ${s.name}? They will be removed from every program.`)) remove.mutate({ id: s.id }); }}>Delete</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
