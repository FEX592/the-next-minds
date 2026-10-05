import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export type RegistrationValues = { firstName: string; lastName: string; country: string; countryCode: string; whatsappNumber: string; classLevel: string; school: string; email: string };
const input = "mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3.5 text-base text-white placeholder:text-slate-600";

/** Personal-details step. Which programs are being registered for is decided before this form is shown. */
export function RegistrationForm({ onSubmit, pending, error, submitLabel }: { onSubmit: (values: RegistrationValues) => void; pending: boolean; error: string; submitLabel: string }) {
  const countries = trpc.public.countries.useQuery();
  const [form, setForm] = useState<RegistrationValues>({ firstName: "", lastName: "", country: "Nigeria", countryCode: "+234", whatsappNumber: "", classLevel: "", school: "", email: "" });
  const levels = trpc.public.levels.useQuery({ country: form.country });
  const [localError, setLocalError] = useState("");
  const set = (key: keyof RegistrationValues, value: string) => setForm(v => ({ ...v, [key]: value }));

  useEffect(() => { if (form.classLevel && levels.data && !levels.data.includes(form.classLevel)) set("classLevel", ""); }, [levels.data]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setLocalError("");
    if (form.whatsappNumber.replace(/\D/g, "").length < 7) return setLocalError("Enter a valid WhatsApp number.");
    if (!form.classLevel) return setLocalError("Choose the class or level that fits you.");
    onSubmit(form);
  };
  const shown = localError || error;

  return (
    <form onSubmit={submit} aria-label="Registration details">
      <div className="grid gap-4 sm:grid-cols-2">
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
      {shown && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{shown}</p>}
      <button type="submit" disabled={pending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-yellow-200 active:scale-[.98] disabled:opacity-60">
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</> : submitLabel}
      </button>
    </form>
  );
}
