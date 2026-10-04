import { Loader2 } from "lucide-react";

export const inputCls = "mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white placeholder:text-slate-600";

export function errMsg(e: any): string {
  const raw = e?.message ?? "Something went wrong.";
  try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.map((i: any) => `${(i.path ?? []).join(".") || "input"}: ${i.message}`).join("; "); } catch {}
  return raw;
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 160);

export function toLocalInput(d?: Date | string | null) {
  if (!d) return "";
  const x = new Date(d); const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

export function Text({ label, value, onChange, type = "text", placeholder, hint, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string; required?: boolean }) {
  return <label className="block text-sm text-slate-300">{label}{required && <span className="text-yellow-300"> *</span>}<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>;
}
export function Area({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return <label className="block text-sm text-slate-300">{label}<textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>;
}
export function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <label className="block text-sm text-slate-300">{label}<select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-yellow-300" />{label}</label>;
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass rounded-2xl p-5 sm:p-6"><h2 className="font-display font-semibold text-white">{title}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div></section>;
}
export function Btn({ children, onClick, busy, variant = "primary", type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; busy?: boolean; variant?: "primary" | "ghost" | "danger"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = variant === "primary" ? "bg-yellow-300 text-slate-950 hover:bg-yellow-200" : variant === "danger" ? "border border-red-400/30 text-red-300 hover:bg-red-400/10" : "border border-white/15 text-slate-200 hover:bg-white/5";
  return <button type={type} onClick={onClick} disabled={busy || disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${cls}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>;
}
export function Loading() { return <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>; }
