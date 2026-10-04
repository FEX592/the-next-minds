import { trpc } from "@/lib/trpc";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Community = { whatsapp?: string; telegram?: string };
const input = "mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3.5 text-base text-white placeholder:text-slate-600";

/** Reusable registration form: pass a programId to register for a program. */
export function ProgramRegistration({ programId, programTitle, ctaLabel }: { programId: number; programTitle: string; ctaLabel?: string | null }) {
  const countries = trpc.public.countries.useQuery();
  const [form, setForm] = useState({ firstName: "", lastName: "", country: "Nigeria", countryCode: "+234", whatsappNumber: "", classLevel: "", school: "", email: "" });
  const levels = trpc.public.levels.useQuery({ country: form.country });
  const register = trpc.public.register.useMutation();
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(v => ({ ...v, [key]: value }));

  useEffect(() => { if (form.classLevel && levels.data && !levels.data.includes(form.classLevel)) set("classLevel", ""); }, [levels.data]);

  if (register.data) {
    const community: Community = register.data.community ?? {};
    return (
      <div className="glass rounded-3xl p-6 sm:p-8" role="status">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-slate-950"><Check className="h-6 w-6" /></div>
        <h3 className="font-display mt-5 text-2xl font-semibold text-white">You're registered!</h3>
        <p className="mt-3 leading-7 text-slate-300">Your spot for <strong className="text-white">{programTitle}</strong> is confirmed.{" "}
          {register.data.emailSent ? "A confirmation email is on its way — check your spam folder if you don't see it." : "We couldn't send the confirmation email just now; join the communities below for updates."}</p>
        {(community.whatsapp || community.telegram) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {community.whatsapp && <a href={community.whatsapp} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-white hover:border-yellow-300/50">WhatsApp Community <ExternalLink className="h-4 w-4" /></a>}
            {community.telegram && <a href={community.telegram} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-white hover:border-yellow-300/50">Telegram Community <ExternalLink className="h-4 w-4" /></a>}
          </div>
        )}
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (form.whatsappNumber.replace(/\D/g, "").length < 7) return setError("Enter a valid WhatsApp number.");
    if (!form.classLevel) return setError("Choose the class or level that fits you.");
    try { await register.mutateAsync({ programId, ...form }); } catch (err: any) { setError(err?.message || "We couldn't save your registration. Please try again."); }
  };

  return (
    <form onSubmit={submit} className="glass rounded-3xl p-6 sm:p-8" aria-label={`Register for ${programTitle}`}>
      <h3 className="font-display text-2xl font-semibold text-white">{ctaLabel || "Register now"}</h3>
      <p className="mt-2 text-sm text-slate-400">Takes under a minute. We'll email your confirmation and community links.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-300">First name<input required autoComplete="given-name" value={form.firstName} onChange={e => set("firstName", e.target.value)} className={input} /></label>
        <label className="block text-sm text-slate-300">Last name<input required autoComplete="family-name" value={form.lastName} onChange={e => set("lastName", e.target.value)} className={input} /></label>
        <label className="block text-sm text-slate-300">Country
          <select value={form.country} onChange={e => { const c = countries.data?.find(x => x.name === e.target.value); if (c) setForm(v => ({ ...v, country: c.name, countryCode: c.code })); }} className={input}>
            {(countries.data ?? [{ name: "Nigeria", code: "+234", flag: "🇳🇬", isoCode: "NG" }]).map(c => <option key={c.name + c.code} value={c.name}>{c.flag} {c.name} ({c.code})</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-300">WhatsApp number<input required type="tel" inputMode="tel" autoComplete="tel-national" value={form.whatsappNumber} onChange={e => set("whatsappNumber", e.target.value)} placeholder="8012345678" className={input} /></label>
        <label className="block text-sm text-slate-300">Class / level
          <select required value={form.classLevel} onChange={e => set("classLevel", e.target.value)} className={input}>
            <option value="">Select…</option>
            {(levels.data ?? []).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-300">School / organization<input required autoComplete="organization" value={form.school} onChange={e => set("school", e.target.value)} className={input} /></label>
        <label className="block text-sm text-slate-300 sm:col-span-2">Email<input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e => set("email", e.target.value)} className={input} /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={register.isPending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-yellow-200 active:scale-[.98] disabled:opacity-60">
        {register.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</> : ctaLabel || "Register now"}
      </button>
    </form>
  );
}
