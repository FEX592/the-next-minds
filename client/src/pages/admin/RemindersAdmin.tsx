import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MailComposer } from "@/components/mail-composer/MailComposer";
import { ComposerPopup, EMAIL_BRANDING, useAdminMailServices } from "@/components/mail-composer/useAdminMail";
import { Btn, errMsg, inputCls, Loading } from "./ui";

const VARIABLES = ["{{firstName}}", "{{fullName}}", "{{programTitle}}", "{{programDate}}", "{{timeUntil}}", "{{platform}}", "{{joinLink}}", "{{programUrl}}", "{{programDetails}}", "{{communityLinks}}", "{{followUpDetails}}", "{{recordingUrl}}", "{{courseTitle}}", "{{courseUrl}}", "{{whatsappLink}}", "{{telegramLink}}"];
const UNITS: [string, number][] = [["minutes", 1], ["hours", 60], ["days", 1440]];
const DEFAULTS = {
  REMINDER: { subject: "Reminder: {{programTitle}}", body: "Hi {{firstName}},\n\n{{programTitle}} starts in {{timeUntil}}.\n\n{{programDetails}}\n\n{{communityLinks}}\n\nTHE NEXT MIND" },
  FOLLOW_UP: { subject: "Thanks for joining {{programTitle}}", body: "Hi {{firstName}},\n\nThank you for being part of {{programTitle}}!\n\n{{followUpDetails}}\n\n{{communityLinks}}\n\nTHE NEXT MIND" },
} as const;

type Rule = { id: number; kind: "REMINDER" | "FOLLOW_UP"; label: string; offsetMinutes: number; enabled: boolean; subject: string; body: string; htmlBody: string | null; description: string; sent: number; failed: number };

export default function RemindersAdmin() {
  const utils = trpc.useUtils();
  const q = trpc.admin.scheduledRules.useQuery();
  const mail = useAdminMailServices();
  const save = trpc.admin.saveScheduledRule.useMutation();
  const remove = trpc.admin.deleteScheduledRule.useMutation({ onSuccess: () => { utils.admin.scheduledRules.invalidate(); toast.success("Deleted."); }, onError: e => toast.error(errMsg(e)) });
  const runNow = trpc.admin.runScheduledNow.useMutation({ onSuccess: r => { utils.admin.scheduledRules.invalidate(); toast.success(`Checked ${r.rules} rule(s): ${r.sent} sent, ${r.failed} failed${r.truncated ? " (more waiting for the next run)" : ""}.`); }, onError: e => toast.error(errMsg(e)) });
  const test = trpc.admin.sendScheduledTest.useMutation({ onSuccess: () => toast.success("Test email sent."), onError: e => toast.error(errMsg(e)) });
  const [editing, setEditing] = useState<{ rule: Rule; key: number } | null>(null);
  const [form, setForm] = useState({ kind: "REMINDER" as "REMINDER" | "FOLLOW_UP", amount: "3", unit: 60 });

  const persist = async (rule: Rule, patch: Partial<Rule>) => {
    const next = { ...rule, ...patch };
    await save.mutateAsync({ id: next.id, kind: next.kind, label: next.label, offsetMinutes: next.offsetMinutes, enabled: next.enabled, subject: next.subject, body: next.body, htmlBody: next.htmlBody });
    await utils.admin.scheduledRules.invalidate();
  };

  const add = async () => {
    const minutes = Math.round(Number(form.amount) * form.unit);
    if (!Number.isFinite(minutes) || minutes < 5) return toast.error("Choose at least 5 minutes.");
    const def = DEFAULTS[form.kind];
    const label = `${form.amount} ${UNITS.find(u => u[1] === form.unit)![0]} ${form.kind === "REMINDER" ? "before" : "after"}`;
    try { await save.mutateAsync({ kind: form.kind, label, offsetMinutes: minutes, enabled: true, subject: def.subject, body: def.body, htmlBody: null }); await utils.admin.scheduledRules.invalidate(); toast.success("Added. Use “Edit email” to customise it."); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (q.isLoading) return <Loading />;
  const rules = (q.data?.rules ?? []) as Rule[];
  return (
    <div className="mt-6 space-y-6">
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-display font-semibold text-white">Reminders & follow-ups</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Sent automatically to everyone registered for a program: reminders before it starts, follow-ups after it ends. Each person gets each email once. Add as many as you like, change the timing, or pause one.</p>
          </div>
          <Btn variant="ghost" busy={runNow.isPending} onClick={() => runNow.mutate()}>Run now</Btn>
        </div>
        <div className={`mt-4 rounded-xl border px-4 py-3 text-xs leading-5 ${q.data?.cronConfigured ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-200" : "border-yellow-300/25 bg-yellow-300/5 text-yellow-100"}`}>
          {q.data?.cronConfigured
            ? <>Scheduler secret is set. Something must call <code>/api/cron/reminders</code> every 5–15 minutes (a free ping service works — see SCHEDULING.md).</>
            : <>Nothing sends automatically until a scheduler secret is set: add a <code>CRON_SECRET</code> environment variable, then point a scheduler at <code>/api/cron/reminders</code> (see SCHEDULING.md). “Run now” works without it.</>}
        </div>
      </div>

      <div className="space-y-3">
        {rules.map(r => (
          <div key={r.id} className="glass flex flex-col gap-4 rounded-2xl p-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className={`rounded-full px-2.5 py-1 ${r.kind === "REMINDER" ? "bg-sky-400/15 text-sky-200" : "bg-violet-400/15 text-violet-200"}`}>{r.kind === "REMINDER" ? "Reminder" : "Follow-up"}</span>
                <span className={`rounded-full px-2.5 py-1 ${r.enabled ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-400"}`}>{r.enabled ? "Active" : "Paused"}</span>
              </div>
              <div className="mt-2 font-semibold text-white">{r.label}</div>
              <div className="text-xs text-slate-500">{r.description} · “{r.subject}” · {r.sent} sent{r.failed ? ` · ${r.failed} failed` : ""}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => setEditing({ rule: r, key: Date.now() })}>Edit email</Btn>
              <Btn variant="ghost" busy={test.isPending && test.variables?.ruleId === r.id} onClick={() => { const to = window.prompt("Send a test of this email to:"); if (to) test.mutate({ ruleId: r.id, recipient: to.trim() }); }}>Send test</Btn>
              <Btn variant="ghost" onClick={() => persist(r, { enabled: !r.enabled }).catch(e => toast.error(errMsg(e)))}>{r.enabled ? "Pause" : "Activate"}</Btn>
              <Btn variant="danger" onClick={() => confirm(`Delete “${r.label}”? Its send history is deleted too.`) && remove.mutate({ id: r.id })}>Delete</Btn>
            </div>
          </div>
        ))}
        {!rules.length && <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-slate-500">No scheduled emails yet.</div>}
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-200">Add another</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_.8fr_1fr_auto] sm:items-end">
          <label className="block text-sm text-slate-300">Type<select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as any }))} className={inputCls}><option value="REMINDER">Reminder (before the program starts)</option><option value="FOLLOW_UP">Follow-up (after the program ends)</option></select></label>
          <label className="block text-sm text-slate-300">How long<input type="number" min={1} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} /></label>
          <label className="block text-sm text-slate-300">Unit<select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: Number(e.target.value) }))} className={inputCls}>{UNITS.map(([l, m]) => <option key={l} value={m}>{l}</option>)}</select></label>
          <Btn busy={save.isPending} onClick={add}><Plus className="h-4 w-4" /> Add</Btn>
        </div>
      </div>

      {editing && (
        <ComposerPopup>
          <MailComposer
            key={editing.key} mode="template" title={editing.rule.label} submitLabel="Save email"
            initialSubject={editing.rule.subject} initialContent={editing.rule.htmlBody || editing.rule.body.replace(/\n/g, "<br>")}
            variables={VARIABLES} attachmentService={mail.attachmentService} branding={EMAIL_BRANDING}
            onSave={async ({ subject, html, text }) => { try { await persist(editing.rule, { subject, body: text, htmlBody: html }); return { ok: true }; } catch (e: any) { return { ok: false, error: errMsg(e) }; } }}
            onClose={() => setEditing(null)}
          />
        </ComposerPopup>
      )}
    </div>
  );
}
