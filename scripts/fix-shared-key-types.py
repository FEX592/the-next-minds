from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text().replace('import { DEFAULT_BODY, DEFAULT_HTML, DEFAULT_SUBJECT, renderTemplate, sendEmail, textToEmailHtml } from "./email";', 'import { DEFAULT_BODY, DEFAULT_HTML, DEFAULT_SUBJECT, decryptProviderKey, encryptProviderKey, renderTemplate, sendEmail, textToEmailHtml } from "./email";')
p.write_text(s)
p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text().replace('q.data?.config?.hasApiKey?', '(q.data?.config as any)?.hasApiKey?')
p.write_text(s)
