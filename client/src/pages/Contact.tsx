import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { useState } from "react";
import { FormError, formErrorText, Honeypot, PArea, PField, SubmitButton, Thanks } from "@/components/programs/forms";
import { PageShell } from "@/components/programs/SiteHeader";

export default function Contact() {
  usePageMeta({ title: "Contact — THE NEXT MIND", description: "Get in touch with the THE NEXT MIND team." });
  const send = trpc.public.contact.useMutation();
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "", hp: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(""); try { await send.mutateAsync(f); } catch (err) { setError(formErrorText(err)); } };

  return (
    <PageShell>
      <section className="max-w-2xl py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Contact</h1>
        <p className="mt-3 leading-7 text-slate-300">Questions, feedback or ideas? Send us a message.</p>
        <div className="mt-8">
          {send.isSuccess ? <Thanks title="Message sent!">Thanks for reaching out — we'll reply by email.</Thanks> : (
            <form onSubmit={submit} className="glass relative space-y-4 rounded-3xl p-6 sm:p-8">
              <Honeypot value={f.hp} onChange={v => setF(s => ({ ...s, hp: v }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <PField label="Name" required autoComplete="name" value={f.name} onChange={set("name")} />
                <PField label="Email" required type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} />
              </div>
              <PField label="Subject" required value={f.subject} onChange={set("subject")} />
              <PArea label="Message" required minLength={10} value={f.message} onChange={set("message")} />
              <FormError message={error} />
              <SubmitButton pending={send.isPending}>Send message</SubmitButton>
            </form>
          )}
        </div>
      </section>
    </PageShell>
  );
}
