import { trpc } from "@/lib/trpc";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, errMsg, inputCls, Loading } from "./ui";
import { HostMailComposer } from "@/components/mail-composer/HostMailComposer";
import "@/components/mail-composer/mail-composer.css";

const P_STATUS: [string, string][] = [["NEW", "New"], ["IN_REVIEW", "In review"], ["ACCEPTED", "Accepted"], ["DECLINED", "Declined"], ["ARCHIVED", "Archived"]];
const C_STATUS: [string, string][] = [["NEW", "New"], ["READ", "Read"], ["ARCHIVED", "Archived"]];
const TYPE_LABEL: Record<string, string> = { SPEAKING: "Speaking", TRAINING: "Training", SPONSORSHIP: "Sponsorship", COMMUNITY_PARTNERSHIP: "Community partnership", CONTENT_COLLABORATION: "Content collaboration", TECHNOLOGY_PARTNERSHIP: "Technology partnership", OTHER: "Other" };

export default function InboxAdmin() {
  const [tab, setTab] = useState<"partnerships" | "contacts">("partnerships");
  const counts = trpc.admin.inboxCounts.useQuery();
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Inbox</div>
      <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Partnerships & messages</h1>
      <div className="mt-6 flex w-fit rounded-xl border border-white/10 bg-white/[.03] p-1">
        {([["partnerships", "Partnership requests", counts.data?.newPartnerships], ["contacts", "Contact messages", counts.data?.newContacts]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-yellow-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>{l}{n ? <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{n}</span> : null}</button>
        ))}
      </div>
      {tab === "partnerships" ? <Partnerships /> : <Contacts />}
    </div>
  );
}

function Filters({ status, setStatus, search, setSearch, options }: { status: string; setStatus: (v: string) => void; search: string; setSearch: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-white/[.03] p-1">{[["", "All"], ...options].map(([v, l]) => <button key={l} onClick={() => setStatus(v)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${status === v ? "bg-yellow-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>{l}</button>)}</div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, message…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm placeholder:text-slate-600" />
    </div>
  );
}

function Partnerships() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("NEW"); const [search, setSearch] = useState("");
  const q = trpc.admin.partnerships.useQuery({ status: (status || undefined) as any, search: search || undefined });
  const refresh = () => { utils.admin.partnerships.invalidate(); utils.admin.inboxCounts.invalidate(); };
  const update = trpc.admin.updatePartnership.useMutation({ onSuccess: refresh, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deletePartnership.useMutation({ onSuccess: () => { refresh(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [reply, setReply] = useState<{ email: string; subject: string } | null>(null);
  return (
    <>
      <Filters status={status} setStatus={setStatus} search={search} setSearch={setSearch} options={P_STATUS} />
      <div className="mt-6 space-y-3">
        {q.isLoading ? <Loading /> : !q.data?.length ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No partnership requests here.</div> : q.data.map(r => (
          <div key={r.id} className="glass rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="min-w-0"><div className="font-semibold text-white">{r.fullName}{r.organization && <span className="font-normal text-slate-400"> · {r.organization}</span>}</div><div className="mt-1 text-xs text-slate-500">{TYPE_LABEL[r.partnershipType]} · {new Date(r.createdAt).toLocaleString()}</div></div>
              <select value={r.status} onChange={e => update.mutate({ id: r.id, status: e.target.value as any })} aria-label="Status" className="rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm text-slate-200">{P_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{r.message}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <button type="button" className="text-left text-yellow-200 hover:underline" onClick={() => setReply({ email: r.email, subject: "Re: NEXT MIND partnership" })}>{r.email}</button>
              {r.phone && <span className="text-slate-400">{r.phone}</span>}
              {r.link && <a className="break-all text-yellow-200 hover:underline" href={r.link} target="_blank" rel="noreferrer noopener">{r.link}</a>}
            </div>
            <textarea rows={2} value={notes[r.id] ?? r.adminNotes ?? ""} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Internal notes…" className={inputCls} />
            <div className="mt-3 flex justify-end gap-2">
              {notes[r.id] !== undefined && notes[r.id] !== (r.adminNotes ?? "") && <Btn variant="ghost" busy={update.isPending} onClick={() => update.mutate({ id: r.id, adminNotes: notes[r.id].trim() || null }, { onSuccess: () => { setNotes(n => { const { [r.id]: _, ...rest } = n; return rest; }); toast.success("Notes saved."); } })}>Save notes</Btn>}
              <Btn variant="danger" onClick={() => confirm("Delete this request permanently?") && remove.mutate({ id: r.id })}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
      {reply && <ReplyComposer email={reply.email} subject={reply.subject} onClose={() => setReply(null)} />}
    </>
  );
}

function Contacts() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("NEW"); const [search, setSearch] = useState("");
  const q = trpc.admin.contacts.useQuery({ status: (status || undefined) as any, search: search || undefined });
  const refresh = () => { utils.admin.contacts.invalidate(); utils.admin.inboxCounts.invalidate(); };
  const update = trpc.admin.updateContact.useMutation({ onSuccess: refresh, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deleteContact.useMutation({ onSuccess: () => { refresh(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  const [reply, setReply] = useState<{ email: string; subject: string } | null>(null);
  return (
    <>
      <Filters status={status} setStatus={setStatus} search={search} setSearch={setSearch} options={C_STATUS} />
      <div className="mt-6 space-y-3">
        {q.isLoading ? <Loading /> : !q.data?.length ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No messages here.</div> : q.data.map(m => (
          <div key={m.id} className="glass rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row"><div className="min-w-0"><div className="font-semibold text-white">{m.subject}</div><div className="mt-1 text-xs text-slate-500">{m.name} · {m.email} · {new Date(m.createdAt).toLocaleString()}</div></div>{m.status === "NEW" && <span className="h-fit w-fit rounded-full bg-yellow-300/15 px-2.5 py-1 text-[11px] font-semibold uppercase text-yellow-100">New</span>}</div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{m.message}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { if (m.status === "NEW") update.mutate({ id: m.id, status: "READ" }); setReply({ email: m.email, subject: "Re: " + m.subject }); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"><Mail className="h-4 w-4" /> Reply</button>
              {m.status !== "READ" && <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "READ" })}>Mark read</Btn>}
              {m.status !== "ARCHIVED" ? <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "ARCHIVED" })}>Archive</Btn> : <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "READ" })}>Restore</Btn>}
              <Btn variant="danger" onClick={() => confirm("Delete this message permanently?") && remove.mutate({ id: m.id })}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
      {reply && <ReplyComposer email={reply.email} subject={reply.subject} onClose={() => setReply(null)} />}
    </>
  );
}

function ReplyComposer({ email, subject, onClose }: { email: string; subject: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"><div className="mx-auto max-w-5xl"><HostMailComposer initialDraft={{ to: [email], subject, content: "<p style=\"margin:0;\"></p>" }} onClose={onClose} /></div></div>;
}
