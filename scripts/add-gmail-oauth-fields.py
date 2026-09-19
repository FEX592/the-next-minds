from pathlib import Path

p=Path('/home/ubuntu/the-next-mind/drizzle/schema.ts')
s=p.read_text().replace('apiKeyEncrypted: text("apiKeyEncrypted"), enabled:', 'apiKeyEncrypted: text("apiKeyEncrypted"), gmailClientIdEncrypted: text("gmailClientIdEncrypted"), gmailClientSecretEncrypted: text("gmailClientSecretEncrypted"), enabled:')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text()
s=s.replace('const { apiKey, ...configInput } = input; const keyUpdate = apiKey ? { apiKeyEncrypted: encryptProviderKey(apiKey) } : {};', 'const { apiKey, gmailClientId, gmailClientSecret, ...configInput } = input; const keyUpdate = { ...(apiKey ? { apiKeyEncrypted: encryptProviderKey(apiKey) } : {}), ...(gmailClientId ? { gmailClientIdEncrypted: encryptProviderKey(gmailClientId) } : {}), ...(gmailClientSecret ? { gmailClientSecretEncrypted: encryptProviderKey(gmailClientSecret) } : {}) };')
s=s.replace('apiKey: z.string().max(500).optional(), replyTo:', 'apiKey: z.string().max(500).optional(), gmailClientId: z.string().max(500).optional(), gmailClientSecret: z.string().max(1000).optional(), replyTo:')
s=s.replace('const { apiKeyEncrypted, ...safeConfig } = result.config; return { ...result, config: { ...safeConfig, hasApiKey: Boolean(apiKeyEncrypted), apiKeyMasked: apiKeyEncrypted ? "••••••••" : "" } };', 'const { apiKeyEncrypted, gmailClientIdEncrypted, gmailClientSecretEncrypted, ...safeConfig } = result.config; return { ...result, config: { ...safeConfig, hasApiKey: Boolean(apiKeyEncrypted), apiKeyMasked: apiKeyEncrypted ? "••••••••" : "", hasGmailOAuth: Boolean(gmailClientIdEncrypted && gmailClientSecretEncrypted), gmailClientIdMasked: gmailClientIdEncrypted ? "••••••••" : "", gmailClientSecretMasked: gmailClientSecretEncrypted ? "••••••••" : "" } };')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text()
s=s.replace('const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [provider,setProvider]=useState<"resend"|"gmail">("gmail");', 'const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [gmailClientId,setGmailClientId]=useState(""); const [gmailClientSecret,setGmailClientSecret]=useState(""); const [provider,setProvider]=useState<"resend"|"gmail">("gmail");')
s=s.replace('setApiKey("");setProvider(c.provider==="gmail"?"gmail":"resend")', 'setApiKey("");setGmailClientId("");setGmailClientSecret("");setProvider(c.provider==="gmail"?"gmail":"resend")')
needle='</label><span className="mt-2 block text-xs text-slate-500">{provider==="gmail"?"Gmail OAuth connection will be shared by every authorized admin. OAuth credentials are required before sending.":"Shared with every authorized admin. The saved key is encrypted at rest and never displayed."}</span></label>'
replacement='</label><span className="mt-2 block text-xs text-slate-500">{provider==="gmail"?"Gmail OAuth connection will be shared by every authorized admin. OAuth credentials are required before sending.":"Shared with every authorized admin. The saved key is encrypted at rest and never displayed."}</span></label>{provider==="gmail"&&<><Field label="Google OAuth Client ID" value={gmailClientId} onChange={setGmailClientId} placeholder={(q.data?.config as any)?.hasGmailOAuth?"Saved securely — enter a new Client ID to replace it":"Your Google OAuth Client ID"}/><label className="text-sm text-slate-300">Google OAuth Client Secret<input type="password" value={gmailClientSecret} onChange={e=>setGmailClientSecret(e.target.value)} placeholder={(q.data?.config as any)?.hasGmailOAuth?"Saved securely — enter a new Client Secret to replace it":"Your Google OAuth Client Secret"} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white placeholder:text-slate-600"/></label></>}'
if needle not in s: raise SystemExit('gmail field block not found')
s=s.replace(needle,replacement)
s=s.replace('apiKey:provider==="resend"?(apiKey||undefined):undefined,provider,enabled:true', 'apiKey:provider==="resend"?(apiKey||undefined):undefined,gmailClientId:provider==="gmail"?(gmailClientId||undefined):undefined,gmailClientSecret:provider==="gmail"?(gmailClientSecret||undefined):undefined,provider,enabled:true')
p.write_text(s)
