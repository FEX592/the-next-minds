from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text()
s=s.replace('const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [provider,setProvider]=useState<"resend"|"gmail">("gmail");', 'const [senderName,setSenderName]=useState(""); const [senderEmail,setSenderEmail]=useState(""); const [apiKey,setApiKey]=useState(""); const [gmailClientId,setGmailClientId]=useState(""); const [gmailClientSecret,setGmailClientSecret]=useState(""); const [provider,setProvider]=useState<"resend"|"gmail">("gmail");')
s=s.replace('setApiKey("");setProvider(c.provider==="gmail"?"gmail":"resend")', 'setApiKey("");setGmailClientId("");setGmailClientSecret("");setProvider(c.provider==="gmail"?"gmail":"resend")')
anchor='<div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">Provider:'
fields='<div className="grid gap-4">{provider==="gmail"&&<><Field label="Google OAuth Client ID" value={gmailClientId} onChange={setGmailClientId} placeholder={(q.data?.config as any)?.hasGmailOAuth?"Saved securely — enter a new Client ID to replace it":"Your Google OAuth Client ID"}/><label className="text-sm text-slate-300">Google OAuth Client Secret<input type="password" value={gmailClientSecret} onChange={e=>setGmailClientSecret(e.target.value)} placeholder={(q.data?.config as any)?.hasGmailOAuth?"Saved securely — enter a new Client Secret to replace it":"Your Google OAuth Client Secret"} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white placeholder:text-slate-600"/></label></>}</div>'
if anchor not in s: raise SystemExit('anchor missing')
s=s.replace(anchor, fields+anchor, 1)
s=s.replace('apiKey:provider==="resend"?(apiKey||undefined):undefined,provider,enabled:true', 'apiKey:provider==="resend"?(apiKey||undefined):undefined,gmailClientId:provider==="gmail"?(gmailClientId||undefined):undefined,gmailClientSecret:provider==="gmail"?(gmailClientSecret||undefined):undefined,provider,enabled:true')
p.write_text(s)
