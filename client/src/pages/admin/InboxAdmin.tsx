import { trpc } from "@/lib/trpc";
import { Mail } from "lucide-react";
import { useState } from "react";
import { MailComposer } from "@/components/mail-composer/MailComposer";
import { noopDraftService } from "@/components/mail-composer/draftService";
import { ComposerPopup, EMAIL_BRANDING, useAdminMailServices } from "@/components/mail-composer/useAdminMail";
import { toast } from "sonner";
import { Btn, errMsg, inputCls, Loading } from "./ui";

const P_STATUS: [string, string][] = [["NEW", "New"], ["IN_REVIEW", "In review"], ["ACCEPTED", "Accepted"], ["DECLINED", "Declined"], ["ARCHIVED", "Archived"]];
const C_STATUS: [string, string][] = [["NEW", "New"], ["READ", "Read"], ["ARCHIVED", "Archived"]];
const TYPE_LABEL: Record<string, string> = { SPEAKING: "Speaking", TRAINING: "Training", SPONSORSHIP: "Sponsorship", COMMUNITY_PARTNERSHIP: "Community partnership", CONTENT_COLLABORATION: "Content collaboration", TECHNOLOGY_PARTNERSHIP: "Technology partnership", OTHER: "Other" };
const P_BADGE: Record<string, string> = { NEW: "bg-yellow-300/15 text-yellow-100", IN_REVIEW: "bg-sky-400/15 text-sky-200", ACCEPTED: "bg-emerald-400/15 text-emerald-200", DECLINED: "bg-rose-400/15 text-rose-200", ARCHIVED: "bg-white/10 text-slate-300" };
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string));

type Reply = { key: number; to: string; subject: string; content: string; onSent: () => void };
type OpenReply = (r: Omit<Reply, "key">) => void;

/** Pre-filled reply body: greeting, sign-off, then the original message quoted underneath. */
const replyContent = (name: string, when: Date, original: string) =>
  `<p style="margin:0 0 16px;">Hi ${esc(name.split(" ")[0] || name)},</p><p style="margin:0 0 16px;"><br></p><p style="margin:0 0 16px;">Warm regards,<br>THE NEXT MIND team</p><p style="margin:28px 0 8px;color:#667085;font-size:13px;">On ${esc(when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}, ${esc(name)} wrote:</p><blockquote style="margin:0;padding:0 0 0 14px;border-left:3px solid #d0d7e2;color:#667085;">${esc(original).replace(/\n/g, "<br>")}</blockquote>`;

export default function InboxAdmin() {
  const [tab, setTab] = useState<"partnerships" | "contacts">("partnerships");
  const counts = trpc.admin.inboxCounts.useQuery();
  const mail = useAdminMailServices(m => toast.success(m));
  const [reply, setReply] = useState<Reply | null>(null);
  const openReply: OpenReply = r => setReply({ ...r, key: Date.now() });
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-200">Inbox</div>
      <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Partnerships & messages</h1>
      <div className="mt-6 flex w-fit rounded-xl border border-white/10 bg-white/[.03] p-1">
        {([["partnerships", "Partnership requests", counts.data?.newPartnerships], ["contacts", "Contact messages", counts.data?.newContacts]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-yellow-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>{l}{n ? <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{n}</span> : null}</button>
        ))}
      </div>
      {tab === "partnerships" ? <Partnerships openReply={openReply} /> : <Contacts openReply={openReply} />}
      {reply && (
        <ComposerPopup>
          <MailComposer key={reply.key} singleUse draftService={noopDraftService} initialTo={[reply.to]} initialSubject={reply.subject} initialContent={reply.content} mailSender={mail.mailSender} attachmentService={mail.attachmentService} branding={EMAIL_BRANDING} onSent={reply.onSent} onClose={() => setReply(null)} />
        </ComposerPopup>
      )}
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

function Partnerships({ openReply }: { openReply: OpenReply }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("NEW"); const [search, setSearch] = useState("");
  const q = trpc.admin.partnerships.useQuery({ status: (status || undefined) as any, search: search || undefined });
  const refresh = () => { utils.admin.partnerships.invalidate(); utils.admin.inboxCounts.invalidate(); };
  const update = trpc.admin.updatePartnership.useMutation({ onSuccess: refresh, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deletePartnership.useMutation({ onSuccess: () => { refresh(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  const [notes, setNotes] = useState<Record<number, string>>({});
  return (
    <>
      <Filters status={status} setStatus={setStatus} search={search} setSearch={setSearch} options={P_STATUS} />
      <div className="mt-6 space-y-3">
        {q.isLoading ? <Loading /> : !q.data?.length ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No partnership requests here.</div> : q.data.map(r => (
          <div key={r.id} className="glass rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="min-w-0"><div className="font-semibold text-white">{r.fullName}{r.organization && <span className="font-normal text-slate-400"> · {r.organization}</span>}</div><div className="mt-1 text-xs text-slate-500">{TYPE_LABEL[r.partnershipType]} · {new Date(r.createdAt).toLocaleString()}</div></div>
              <span className={`h-fit w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${P_BADGE[r.status]}`}>{P_STATUS.find(x => x[0] === r.status)?.[1]}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{r.message}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="text-slate-300">{r.email}</span>
              {r.phone && <span className="text-slate-400">{r.phone}</span>}
              {r.link && <a className="break-all text-yellow-200 hover:underline" href={r.link} target="_blank" rel="noreferrer noopener">{r.link}</a>}
            </div>
            <textarea rows={2} value={notes[r.id] ?? r.adminNotes ?? ""} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Internal notes…" className={inputCls} />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {notes[r.id] !== undefined && notes[r.id] !== (r.adminNotes ?? "") && <Btn variant="ghost" busy={update.isPending} onClick={() => update.mutate({ id: r.id, adminNotes: notes[r.id].trim() || null }, { onSuccess: () => { setNotes(n => { const { [r.id]: _, ...rest } = n; return rest; }); toast.success("Notes saved."); } })}>Save notes</Btn>}
              <button type="button" onClick={() => openReply({ to: r.email, subject: `Re: NEXT MIND partnership — ${TYPE_LABEL[r.partnershipType]}`, content: replyContent(r.fullName, new Date(r.createdAt), r.message), onSent: () => { if (r.status === "NEW") update.mutate({ id: r.id, status: "IN_REVIEW" }); } })} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"><Mail className="h-4 w-4" /> Reply</button>
              {r.status === "NEW" && <Btn variant="ghost" onClick={() => update.mutate({ id: r.id, status: "IN_REVIEW" })}>Mark in review</Btn>}
              {r.status !== "ACCEPTED" && <Btn variant="ghost" onClick={() => update.mutate({ id: r.id, status: "ACCEPTED" })}>Accept</Btn>}
              {r.status !== "DECLINED" && <Btn variant="ghost" onClick={() => update.mutate({ id: r.id, status: "DECLINED" })}>Decline</Btn>}
              {r.status !== "ARCHIVED" ? <Btn variant="ghost" onClick={() => update.mutate({ id: r.id, status: "ARCHIVED" })}>Archive</Btn> : <Btn variant="ghost" onClick={() => update.mutate({ id: r.id, status: "IN_REVIEW" })}>Restore</Btn>}
              <Btn variant="danger" onClick={() => confirm("Delete this request permanently?") && remove.mutate({ id: r.id })}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Contacts({ openReply }: { openReply: OpenReply }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("NEW"); const [search, setSearch] = useState("");
  const q = trpc.admin.contacts.useQuery({ status: (status || undefined) as any, search: search || undefined });
  const refresh = () => { utils.admin.contacts.invalidate(); utils.admin.inboxCounts.invalidate(); };
  const update = trpc.admin.updateContact.useMutation({ onSuccess: refresh, onError: e => toast.error(errMsg(e)) });
  const remove = trpc.admin.deleteContact.useMutation({ onSuccess: () => { refresh(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  return (
    <>
      <Filters status={status} setStatus={setStatus} search={search} setSearch={setSearch} options={C_STATUS} />
      <div className="mt-6 space-y-3">
        {q.isLoading ? <Loading /> : !q.data?.length ? <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No messages here.</div> : q.data.map(m => (
          <div key={m.id} className="glass rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row"><div className="min-w-0"><div className="font-semibold text-white">{m.subject}</div><div className="mt-1 text-xs text-slate-500">{m.name} · {m.email} · {new Date(m.createdAt).toLocaleString()}</div></div>{m.status === "NEW" && <span className="h-fit w-fit rounded-full bg-yellow-300/15 px-2.5 py-1 text-[11px] font-semibold uppercase text-yellow-100">New</span>}</div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{m.message}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => openReply({ to: m.email, subject: m.subject.toLowerCase().startsWith("re:") ? m.subject : `Re: ${m.subject}`, content: replyContent(m.name, new Date(m.createdAt), m.message), onSent: () => { if (m.status === "NEW") update.mutate({ id: m.id, status: "READ" }); } })} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"><Mail className="h-4 w-4" /> Reply</button>
              {m.status !== "READ" && <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "READ" })}>Mark read</Btn>}
              {m.status !== "ARCHIVED" ? <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "ARCHIVED" })}>Archive</Btn> : <Btn variant="ghost" onClick={() => update.mutate({ id: m.id, status: "READ" })}>Restore</Btn>}
              <Btn variant="danger" onClick={() => confirm("Delete this message permanently?") && remove.mutate({ id: m.id })}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
