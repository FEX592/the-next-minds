import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/auth/signup/:token");
  const isSignup = Boolean(params?.token);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!isSignup) fetch("/api/auth/local/bootstrap-status").then(r => r.json()).then(result => setBootstrapAvailable(Boolean(result.available))).catch(() => undefined); }, [isSignup]);
  const isBootstrap = !isSignup && bootstrapAvailable;
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const path = isSignup ? "/api/auth/local/signup" : isBootstrap ? "/api/auth/local/bootstrap" : "/api/auth/local/signin"; const body = isSignup ? { name, email, password, inviteToken: params?.token } : isBootstrap ? { name, email, password, setupToken: setupToken || undefined } : { email, password }; const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Authentication failed"); window.location.href = "/admin"; } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed"); setBusy(false); } }
  const title = isSignup ? "Create your account" : isBootstrap ? "Create the first administrator" : "Sign in";
  const description = isSignup ? "This invitation creates a password-protected account." : isBootstrap ? "No administrator exists yet. Create the first administrator account now." : "Use your email address and password to continue.";
  return <main className="min-h-screen bg-[#07101d] px-5 py-16 text-white"><div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[.04] p-8 shadow-2xl"><p className="text-xs uppercase tracking-[.2em] text-yellow-200">THE NEXT MIND · Admin</p><h1 className="mt-3 text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p><form onSubmit={submit} className="mt-8 grid gap-4">{(isSignup || isBootstrap) && <label className="text-sm text-slate-300">Full name<Input value={name} onChange={e => setName(e.target.value)} required className="mt-2" /></label>}<label className="text-sm text-slate-300">Email<Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-2" /></label><label className="text-sm text-slate-300">Password<Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required className="mt-2" /></label>{isBootstrap && <label className="text-sm text-slate-300">Bootstrap setup token <span className="text-slate-500">(only if configured)</span><Input value={setupToken} onChange={e => setSetupToken(e.target.value)} className="mt-2" /></label>}{error && <p className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}<Button type="submit" disabled={busy} className="mt-2 bg-yellow-300 text-slate-950 hover:bg-yellow-200">{busy ? "Please wait…" : isSignup ? "Create account" : isBootstrap ? "Create first administrator" : "Sign in"}</Button>{!isSignup && <button type="button" onClick={() => setLocation("/")} className="text-sm text-slate-400 hover:text-white">Back to home</button>}</form></div></main>;
}
