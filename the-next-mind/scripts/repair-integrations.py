from pathlib import Path

root = Path('/home/ubuntu/the-next-minds-repair')

p = root / 'server/google-oauth.ts'
s = p.read_text()
s = s.replace('import { ONE_YEAR_MS, safeAdminReturnTo } from "@shared/const";', 'import { COOKIE_NAME, ONE_YEAR_MS, safeAdminReturnTo } from "@shared/const";')
s = s.replace('res.cookie("manus_session", sessionToken,', 'res.cookie(COOKIE_NAME, sessionToken,')
p.write_text(s)

p = root / 'server/_core/env.ts'
s = p.read_text()
s = s.replace('  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",\n', '  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",\n  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",\n  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",\n  googleAdminEmails: process.env.GOOGLE_ADMIN_EMAILS ?? "",\n')
p.write_text(s)

p = root / 'server/google-oauth.ts'
s = p.read_text()
s = s.replace('import { sdk } from "./_core/sdk";', 'import { sdk } from "./_core/sdk";\nimport { ENV } from "./_core/env";')
s = s.replace('    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",\n    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",\n    adminEmails: (process.env.GOOGLE_ADMIN_EMAILS ?? "")', '    clientId: ENV.googleClientId.trim(),\n    clientSecret: ENV.googleClientSecret.trim(),\n    adminEmails: ENV.googleAdminEmails')
p.write_text(s)

p = root / 'server/routers.ts'
s = p.read_text()
s = s.replace('import { storagePut } from "./storage";', 'import { storagePut } from "./storage";\nimport { isGoogleOAuthConfigured } from "./google-oauth";')
s = s.replace('const result = await sendEmail({ apiKey: decryptProviderKey(config?.apiKeyEncrypted),', 'const result = await sendEmail({ provider: config?.provider === "gmail" ? "gmail" : "resend", apiKey: decryptProviderKey(config?.apiKeyEncrypted),')
s = s.replace('hasGmailOAuth: Boolean(gmailClientIdEncrypted && gmailClientSecretEncrypted), gmailClientIdMasked:', 'hasGmailOAuth: Boolean(gmailClientIdEncrypted && gmailClientSecretEncrypted), googleSignInConfigured: isGoogleOAuthConfigured(), gmailClientIdMasked:')
old = 'z.object({ senderName: z.string().min(1).max(160), senderEmail: z.string().email(), apiKey: z.string().max(500).optional(), gmailClientId: z.string().max(500).optional(), gmailClientSecret: z.string().max(1000).optional(), replyTo: z.string().email().optional().or(z.literal("")), provider: z.enum(["resend", "gmail"]), enabled: z.boolean() })'
new = 'z.object({ senderName: z.string().min(1).max(160), senderEmail: z.string().email(), apiKey: z.string().max(500).optional(), replyTo: z.string().email().optional().or(z.literal("")), provider: z.literal("resend"), enabled: z.boolean() })'
s = s.replace(old, new)
s = s.replace('const { apiKey, gmailClientId, gmailClientSecret, ...configInput } = input; const keyUpdate = { ...(apiKey ? { apiKeyEncrypted: encryptProviderKey(apiKey) } : {}), ...(gmailClientId ? { gmailClientIdEncrypted: encryptProviderKey(gmailClientId) } : {}), ...(gmailClientSecret ? { gmailClientSecretEncrypted: encryptProviderKey(gmailClientSecret) } : {}) };', 'const { apiKey, ...configInput } = input; const keyUpdate = apiKey ? { apiKeyEncrypted: encryptProviderKey(apiKey) } : {};')
p.write_text(s)

p = root / 'client/src/pages/Admin.tsx'
s = p.read_text()
s = s.replace('const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [gmailClientId,setGmailClientId]=useState(""); const [gmailClientSecret,setGmailClientSecret]=useState(""); const [provider,setProvider]=useState<"resend"|"gmail">("gmail");', 'const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [provider,setProvider]=useState<"resend">("resend");')
s = s.replace('setApiKey("");setGmailClientId("");setGmailClientSecret("");setProvider(c.provider==="gmail"?"gmail":"resend")', 'setApiKey("");setProvider("resend")')
start = '<label className="text-sm text-slate-300">Email provider<select'
idx = s.find(start)
end_marker = '<button onClick={()=>saveConfig.mutate('
end = s.find(end_marker, idx)
if idx == -1 or end == -1:
    raise SystemExit('Email setup block markers not found')
replacement = '''<div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"><div className="flex items-center justify-between gap-4"><span>Transactional email provider</span><strong className="text-white">Resend API</strong></div><p className="mt-2 text-xs leading-5 text-slate-500">Resend is for sending registration and admin emails. Google sign-in is a separate authentication flow and never uses the Resend key.</p></div><label className="text-sm text-slate-300">Shared Resend API key<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={(q.data?.config as any)?.hasApiKey?"Saved securely — enter a new key to replace it":"re_..."} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white placeholder:text-slate-600"/><span className="mt-2 block text-xs text-slate-500">Encrypted at rest, shared with every authorized administrator, and never returned to the browser.</span></label><div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"><div className="flex items-center justify-between gap-4"><span>Google admin sign-in</span><strong className={(q.data?.config as any)?.googleSignInConfigured?"text-emerald-200":"text-yellow-200"}>{(q.data?.config as any)?.googleSignInConfigured?"Configured":"Needs secrets"}</strong></div><p className="mt-2 text-xs leading-5 text-slate-500">The Gmail button uses server-side Google OAuth secrets and an email allowlist. It is independent from Resend email delivery.</p></div>'''
s = s[:idx] + replacement + s[end:]
s = s.replace('apiKey:provider==="resend"?(apiKey||undefined):undefined,gmailClientId:provider==="gmail"?(gmailClientId||undefined):undefined,gmailClientSecret:provider==="gmail"?(gmailClientSecret||undefined):undefined,provider,enabled:true', 'apiKey:apiKey||undefined,provider:"resend",enabled:true')
# Auth gate: replace the single Manus button with Google first and Manus fallback.
old = '{!user?<button onClick={()=>startLogin(location)} className="mt-7 w-full rounded-xl bg-yellow-300 px-4 py-3.5 font-semibold text-slate-950">Sign in securely</button>:<button onClick={()=>consumeInvite.mutate({token:inviteParams!.token})}'
new = '{!user?<div className="mt-7 grid gap-3"><a href={`/api/auth/google/start?returnTo=${encodeURIComponent(location)}`} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-semibold text-slate-950"><span className="text-lg font-bold">G</span> Sign in with Gmail</a><button onClick={()=>startLogin(location)} className="w-full rounded-xl border border-white/10 px-4 py-3.5 font-semibold text-slate-200 hover:bg-white/5">Use Manus sign-in instead</button></div>:<button onClick={()=>consumeInvite.mutate({token:inviteParams!.token})}'
if old not in s:
    raise SystemExit('Auth button marker not found')
s = s.replace(old, new)
p.write_text(s)

p = root / 'server/_core/index.ts'
s = p.read_text()
s = s.replace('import { registerOAuthRoutes } from "./oauth";', 'import { registerOAuthRoutes } from "./oauth";\nimport { registerGoogleOAuthRoutes } from "../google-oauth";')
s = s.replace('  registerOAuthRoutes(app);\n', '  registerOAuthRoutes(app);\n  registerGoogleOAuthRoutes(app);\n')
p.write_text(s)

p = root / 'server/email.test.ts'
s = p.read_text()
s = s.replace('  it("reports the provider message id only after a successful provider response", async () => {', '  it("keeps Gmail sending separate from Resend and fails closed until Gmail is connected", async () => {\n    const result = await sendEmail({ provider: "gmail", from: "THE NEXT MIND <hello@example.com>", to: ["student@example.com"], subject: "Test", html: "<p>Test</p>", idempotencyKey: "gmail-separation-test" });\n    expect(result).toEqual({ ok: false, error: expect.stringContaining("Gmail") });\n  });\n\n  it("reports the provider message id only after a successful provider response", async () => {')
p.write_text(s)

(root / 'server/google-oauth.test.ts').write_text('''import { afterEach, describe, expect, it } from "vitest";\nimport { isGoogleAdminEmailAllowed, isGoogleOAuthConfigured } from "./google-oauth";\n\nconst original = {\n  clientId: process.env.GOOGLE_CLIENT_ID,\n  clientSecret: process.env.GOOGLE_CLIENT_SECRET,\n  adminEmails: process.env.GOOGLE_ADMIN_EMAILS,\n};\n\nafterEach(() => {\n  for (const [key, value] of Object.entries({ GOOGLE_CLIENT_ID: original.clientId, GOOGLE_CLIENT_SECRET: original.clientSecret, GOOGLE_ADMIN_EMAILS: original.adminEmails })) {\n    if (value === undefined) delete process.env[key];\n    else process.env[key] = value;\n  }\n});\n\ndescribe("Google admin sign-in configuration", () => {\n  it("requires both OAuth credentials and an allowlisted admin email", () => {\n    process.env.GOOGLE_CLIENT_ID = "client-id";\n    process.env.GOOGLE_CLIENT_SECRET = "client-secret";\n    process.env.GOOGLE_ADMIN_EMAILS = "admin@example.com";\n    expect(isGoogleOAuthConfigured()).toBe(true);\n    expect(isGoogleAdminEmailAllowed("ADMIN@example.com")).toBe(true);\n    expect(isGoogleAdminEmailAllowed("other@example.com")).toBe(false);\n  });\n\n  it("is disabled when any required setting is missing", () => {\n    process.env.GOOGLE_CLIENT_ID = "client-id";\n    process.env.GOOGLE_CLIENT_SECRET = "";\n    process.env.GOOGLE_ADMIN_EMAILS = "admin@example.com";\n    expect(isGoogleOAuthConfigured()).toBe(false);\n  });\n});\n''')
