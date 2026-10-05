import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { CalendarDays, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { RegistrationForm, type RegistrationValues } from "@/components/programs/RegistrationForm";
import { RegistrationSuccess } from "@/components/programs/RegistrationSuccess";
import { PageShell } from "@/components/programs/SiteHeader";
import { formatWhen, STATUS_LABEL, TYPE_LABEL } from "@/components/programs/format";
import { formErrorText } from "@/components/programs/forms";
import { useProgramSelection } from "@/contexts/ProgramSelection";

export default function Register() {
  usePageMeta({ title: "Register — THE NEXT MIND", description: "Confirm your programs and complete your registration." });
  const query = trpc.public.programs.useQuery();
  const { picked, remove, clear } = useProgramSelection();
  const register = trpc.public.register.useMutation();
  const [step, setStep] = useState<"confirm" | "details">("confirm");
  const [error, setError] = useState("");

  const open = useMemo(() => (query.data ?? []).filter(p => p.registrationOpen), [query.data]);
  // Drop picks that have closed or disappeared since they were selected.
  useEffect(() => { if (!query.data) return; const ids = new Set(open.map(p => p.id)); picked.forEach(p => { if (!ids.has(p.id)) remove(p.id); }); }, [query.data]);
  const chosen = picked.map(pk => open.find(p => p.id === pk.id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const submit = async (values: RegistrationValues) => {
    setError("");
    try { await register.mutateAsync({ programIds: chosen.map(p => p.id), ...values }); clear(); }
    catch (e) { setError(formErrorText(e)); }
  };

  let body: React.ReactNode;
  if (register.data) body = <RegistrationSuccess result={register.data} />;
  else if (query.isLoading) body = <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-yellow-200" /></div>;
  else if (query.error) body = <p className="py-16 text-center text-slate-400">Couldn't load programs. Please refresh.</p>;
  else if (open.length === 0) body = (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold text-white">Registration is currently unavailable</h2>
      <p className="mt-3 leading-7 text-slate-300">No programs are open for registration right now. New programs are announced regularly — check back soon.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/programs" className="rounded-xl bg-yellow-300 px-5 py-3 text-sm font-semibold text-slate-950">Browse programs</Link><Link href="/contact" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">Contact us</Link></div>
    </div>
  );
  else if (chosen.length === 0) body = (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold text-white">Select a program first</h2>
      <p className="mt-3 leading-7 text-slate-300">Registration starts from the programs list. Pick one or more programs, then press Register.</p>
      <Link href="/programs" className="mt-5 inline-block rounded-xl bg-yellow-300 px-5 py-3 text-sm font-semibold text-slate-950">Choose programs</Link>
    </div>
  );
  else if (step === "confirm") body = (
    <div>
      <h2 className="font-display text-2xl font-semibold text-white">Confirm your programs</h2>
      <p className="mt-2 text-sm text-slate-400">You're registering for {chosen.length === 1 ? "this program" : `these ${chosen.length} programs`}.</p>
      <ul className="mt-5 space-y-3">
        {chosen.map(p => (
          <li key={p.id} className="glass flex items-start gap-3 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-yellow-200">{TYPE_LABEL[p.type] ?? p.type} · {STATUS_LABEL[p.status]}</div>
              <div className="mt-1 font-semibold text-white">{p.title}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400"><CalendarDays className="h-4 w-4" />{formatWhen(p.startAt)}</div>
            </div>
            <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setStep("details")} className="rounded-xl bg-yellow-300 px-6 py-4 font-semibold text-slate-950 hover:bg-yellow-200 sm:flex-1">Confirm & continue</button>
        <Link href="/programs" className="rounded-xl border border-white/15 px-6 py-4 text-center font-semibold text-white hover:border-white/40">Add more programs</Link>
      </div>
    </div>
  );
  else body = (
    <div>
      <button type="button" onClick={() => setStep("confirm")} className="text-sm text-slate-400 hover:text-white">← Back to programs</button>
      <h2 className="font-display mt-3 text-2xl font-semibold text-white">Your details</h2>
      <div className="mt-3 flex flex-wrap gap-2">{chosen.map(p => <span key={p.id} className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs text-yellow-100">{p.title}</span>)}</div>
      <div className="glass mt-6 rounded-3xl p-6 sm:p-8">
        <RegistrationForm onSubmit={submit} pending={register.isPending} error={error} submitLabel={chosen.length === 1 ? "Complete registration" : `Register for ${chosen.length} programs`} />
      </div>
    </div>
  );

  return (
    <PageShell hideSelectionBar>
      <section className="max-w-2xl py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Register</h1>
        <div className="mt-8">{body}</div>
      </section>
    </PageShell>
  );
}
