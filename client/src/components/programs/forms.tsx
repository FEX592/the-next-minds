import { Check, Loader2 } from "lucide-react";

const cls = "mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3.5 text-base text-white placeholder:text-slate-600";
export const PField = ({ label, hint, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) => <label className="block text-sm text-slate-300">{label}<input {...p} className={cls} />{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>;
export const PArea = ({ label, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => <label className="block text-sm text-slate-300">{label}<textarea rows={5} {...p} className={cls} /></label>;
export const PSelect = ({ label, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => <label className="block text-sm text-slate-300">{label}<select {...p} className={cls}>{children}</select></label>;
/** Hidden honeypot — real users never see or fill it. */
export const Honeypot = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={value} onChange={e => onChange(e.target.value)} /></label></div>;
export const SubmitButton = ({ pending, children }: { pending: boolean; children: React.ReactNode }) => <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-yellow-200 active:scale-[.98] disabled:opacity-60">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : children}</button>;
export const FormError = ({ message }: { message: string }) => message ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p> : null;
export const Thanks = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="glass rounded-3xl p-6 sm:p-8" role="status"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-slate-950"><Check className="h-6 w-6" /></div><h2 className="font-display mt-5 text-2xl font-semibold text-white">{title}</h2><p className="mt-3 leading-7 text-slate-300">{children}</p></div>;
export function formErrorText(e: any): string {
  const raw = e?.message ?? "Something went wrong. Please try again.";
  try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr[0]?.message ?? raw; } catch {}
  return raw;
}
