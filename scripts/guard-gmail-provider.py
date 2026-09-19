from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/server/email.ts')
s=p.read_text().replace('type SendInput = { apiKey?: string; from:', 'type SendInput = { provider?: "gmail" | "resend"; apiKey?: string; from:')
s=s.replace('export async function sendEmail(input:SendInput):Promise<SendResult>{const key=', 'export async function sendEmail(input:SendInput):Promise<SendResult>{if(input.provider==="gmail")return{ok:false,error:"Gmail is selected but no Gmail OAuth connection is active. Connect Gmail in Email Setup before sending."};const key=')
p.write_text(s)
p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text().replace('sendEmail({ apiKey: decryptProviderKey(config?.apiKeyEncrypted), from:', 'sendEmail({ provider: config?.provider === "gmail" ? "gmail" : "resend", apiKey: decryptProviderKey(config?.apiKeyEncrypted), from:')
p.write_text(s)
