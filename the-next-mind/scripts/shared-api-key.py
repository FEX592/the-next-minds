from pathlib import Path

p=Path('/home/ubuntu/the-next-mind/drizzle/schema.ts')
s=p.read_text().replace('provider: varchar("provider", { length: 80 }).notNull().default("resend"), enabled:', 'provider: varchar("provider", { length: 80 }).notNull().default("resend"), apiKeyEncrypted: text("apiKeyEncrypted"), enabled:')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/server/email.ts')
s=p.read_text()
s=s.replace('import { storageGetSignedUrl } from "./storage";', 'import crypto from "node:crypto";\nimport { storageGetSignedUrl } from "./storage";\nimport { ENV } from "./_core/env";')
s=s.replace('type Media =', '''const keyMaterial = () => crypto.createHash("sha256").update(ENV.cookieSecret || "the-next-mind-fallback-key").digest();
export function encryptProviderKey(value: string) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decryptProviderKey(value?: string | null) { if (!value) return ""; try { const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url")); const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"); } catch { return ""; } }
type Media =''')
s=s.replace('type SendInput = { from:', 'type SendInput = { apiKey?: string; from:')
s=s.replace('const key=process.env.RESEND_API_KEY;', 'const key=input.apiKey || process.env.RESEND_API_KEY;')
s=s.replace('RESEND_API_KEY before sending.', 'a shared provider API key before sending.')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/server/db.ts')
s=p.read_text().replace('import { DEFAULT_BODY, DEFAULT_HTML } from "./email";', 'import { DEFAULT_BODY, DEFAULT_HTML, decryptProviderKey } from "./email";')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text().replace('DEFAULT_BODY, DEFAULT_HTML, renderTemplate, sendEmail, textToEmailHtml', 'DEFAULT_BODY, DEFAULT_HTML, decryptProviderKey, encryptProviderKey, renderTemplate, sendEmail, textToEmailHtml')
s=s.replace('const config = (await getConfig())?.config;', 'const config = (await getConfig())?.config;')
s=s.replace('const result = await sendEmail({ from, replyTo:', 'const result = await sendEmail({ apiKey: decryptProviderKey(config?.apiKeyEncrypted), from, replyTo:')
s=s.replace('return getConfig(); }),', 'const result = await getConfig(); if (result?.config) { const { apiKeyEncrypted, ...safeConfig } = result.config; return { ...result, config: { ...safeConfig, hasApiKey: Boolean(apiKeyEncrypted), apiKeyMasked: apiKeyEncrypted ? "••••••••" : "" } }; } return result; }),')
s=s.replace('senderEmail: z.string().email(), replyTo:', 'senderEmail: z.string().email(), apiKey: z.string().max(500).optional(), replyTo:')
s=s.replace('if (existing[0]) await db.update(emailConfig).set({ ...input, updatedBy: ctx.user.id }).where(eq(emailConfig.id, existing[0].id)); else await db.insert(emailConfig).values({ ...input, updatedBy: ctx.user.id });', 'const { apiKey, ...configInput } = input; const keyUpdate = apiKey ? { apiKeyEncrypted: encryptProviderKey(apiKey) } : {}; if (existing[0]) await db.update(emailConfig).set({ ...configInput, ...keyUpdate, updatedBy: ctx.user.id }).where(eq(emailConfig.id, existing[0].id)); else await db.insert(emailConfig).values({ ...configInput, ...keyUpdate, updatedBy: ctx.user.id });')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text()
s=s.replace('const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState("");', 'const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState("");')
s=s.replace('setSenderName(c.senderName);setSenderEmail(c.senderEmail);setReplyTo(c.replyTo||"")', 'setSenderName(c.senderName);setSenderEmail(c.senderEmail);setReplyTo(c.replyTo||"");setApiKey("")')
s=s.replace('Field label="Reply-to email" value={replyTo} onChange={setReplyTo} placeholder="support@example.com" type="email"/>', 'Field label="Reply-to email" value={replyTo} onChange={setReplyTo} placeholder="support@example.com" type="email"/><label className="text-sm text-slate-300">Shared Resend API key<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={q.data?.config?.hasApiKey?"Saved securely — enter a new key to replace it":"re_..."} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white placeholder:text-slate-600"/><span className="mt-2 block text-xs text-slate-500">Shared with every authorized admin. The saved key is encrypted at rest and never displayed.</span></label>')
s=s.replace('saveConfig.mutate({senderName,senderEmail,replyTo,provider:"resend",enabled:true})', 'saveConfig.mutate({senderName,senderEmail,replyTo,apiKey:apiKey||undefined,provider:"resend",enabled:true})')
p.write_text(s)
