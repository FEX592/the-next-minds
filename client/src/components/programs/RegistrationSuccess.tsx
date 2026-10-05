import { Check, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { shareSite } from "@/lib/share";

export type RegistrationResult = {
  registered: { title: string; slug: string }[];
  skipped: { title: string; reason: string }[];
  emailSent: boolean;
  community: { whatsapp: string[]; telegram: string[] };
};

/** Confirmation screen: lists exactly which programs the person is now registered for. */
export function RegistrationSuccess({ result }: { result: RegistrationResult }) {
  const [shared, setShared] = useState("");
  const { registered, skipped, emailSent, community } = result;
  return (
    <div className="glass rounded-3xl p-6 sm:p-8" role="status">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-slate-950"><Check className="h-6 w-6" /></div>
      <h2 className="font-display mt-5 text-2xl font-semibold text-white">You're registered!</h2>
      <ul className="mt-4 space-y-2">
        {registered.map(p => <li key={p.slug} className="flex items-start gap-3 text-slate-200"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" /><Link href={`/programs/${p.slug}`} className="hover:underline">{p.title}</Link></li>)}
      </ul>
      {skipped.length > 0 && (
        <div className="mt-5 rounded-xl border border-yellow-300/25 bg-yellow-300/5 p-4 text-sm text-yellow-100">
          <div className="font-semibold">Not registered</div>
          <ul className="mt-2 space-y-1 text-yellow-100/80">{skipped.map((s, i) => <li key={i}>{s.title} — {s.reason}</li>)}</ul>
        </div>
      )}
      <p className="mt-5 leading-7 text-slate-300">{emailSent ? "A confirmation email with the details is on its way — check your spam folder if you don't see it." : "We couldn't send the confirmation email just now. Join the communities below for updates."}</p>
      {(community.whatsapp.length > 0 || community.telegram.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {community.whatsapp.map(u => <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-white hover:border-yellow-300/50">WhatsApp Community <ExternalLink className="h-4 w-4" /></a>)}
          {community.telegram.map(u => <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-white hover:border-yellow-300/50">Telegram Community <ExternalLink className="h-4 w-4" /></a>)}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={async () => { const r = await shareSite(); setShared(r === "copied" ? "Message copied" : ""); }} className="inline-flex items-center gap-2 rounded-xl bg-yellow-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-200"><Share2 className="h-4 w-4" />{shared || "Share THE NEXT MIND"}</button>
        <Link href="/programs" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-white/40">Browse more programs</Link>
      </div>
    </div>
  );
}
