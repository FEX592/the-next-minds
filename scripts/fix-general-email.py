from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text().replace('category: "GENERAL", recipient, subject: input.subject, text: input.body, html:', 'category: "GENERAL", recipient, subject: input.subject, body: input.body, html:')
p.write_text(s)
