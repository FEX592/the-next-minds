import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { useState } from "react";
import { FormError, formErrorText, Honeypot, PArea, PField, PSelect, SubmitButton, Thanks } from "@/components/programs/forms";
import { PageShell } from "@/components/programs/SiteHeader";

const TYPES: [string, string][] = [["SPEAKING", "Speaking"], ["TRAINING", "Training"], ["SPONSORSHIP", "Sponsorship"], ["COMMUNITY_PARTNERSHIP", "Community partnership"], ["CONTENT_COLLABORATION", "Content collaboration"], ["TECHNOLOGY_PARTNERSHIP", "Technology partnership"], ["OTHER", "Other"]];

export default function Partner() {
  usePageMeta({ title: "Partner With Us — THE NEXT MIND", description: "Collaborate with THE NEXT MIND: speaking, training, sponsorship, community, content and technology partnerships." });
  const send = trpc.public.partnership.useMutation();
  const [f, setF] = useState({ fullName: "", email: "", organization: "", phone: "", partnershipType: "SPEAKING", message: "", link: "", hp: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(""); try { await send.mutateAsync({ ...f, partnershipType: f.partnershipType as any }); } catch (err) { setError(formErrorText(err)); } };

  return (
    <PageShell>
      <section className="max-w-2xl py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Partner with NEXT MIND</h1>
        <p className="mt-3 leading-7 text-slate-300">Speak, train, sponsor or build with us. Tell us what you have in mind and the team will get back to you.</p>
        <div className="mt-8">
          {send.isSuccess ? <Thanks title="Thank you!">We've received your proposal and will reach out by email soon.</Thanks> : (
            <form onSubmit={submit} className="glass relative space-y-4 rounded-3xl p-6 sm:p-8">
              <Honeypot value={f.hp} onChange={v => setF(s => ({ ...s, hp: v }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <PField label="Full name" required autoComplete="name" value={f.fullName} onChange={set("fullName")} />
                <PField label="Email" required type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} />
                <PField label="Organization / brand" autoComplete="organization" value={f.organization} onChange={set("organization")} />
                <PField label="Phone / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
              </div>
              <PSelect label="Partnership type" value={f.partnershipType} onChange={set("partnershipType")}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</PSelect>
              <PArea label="Message / proposal" required minLength={20} value={f.message} onChange={set("message")} />
              <PField label="Website or social link (optional)" inputMode="url" value={f.link} onChange={set("link")} placeholder="https://" />
              <FormError message={error} />
              <SubmitButton pending={send.isPending}>Send proposal</SubmitButton>
            </form>
          )}
        </div>
      </section>
    </PageShell>
  );
}
