from pathlib import Path

root = Path('/home/ubuntu/the-next-minds-repair')
old = '/manus-storage/next-mind-brand_32947041.jpg'
new = '/manus-storage/WhatsAppImage2026-09-16at12.59.07_a92a3ebd.jpeg'
files = [
    root / 'client/src/pages/Home.tsx',
    root / 'client/src/pages/Admin.tsx',
    root / 'client/index.html',
    root / 'server/db.ts',
    root / 'server/email.ts',
]
for path in files:
    text = path.read_text()
    if old in text:
        path.write_text(text.replace(old, new))
db = root / 'server/db.ts'
text = db.read_text()
text = text.replace('fileKey:"next-mind-brand_32947041.jpg"', 'fileKey:"WhatsAppImage2026-09-16at12.59.07_a92a3ebd.jpeg"')
db.write_text(text)

css = root / 'client/src/index.css'
text = css.read_text()
needle = "body { margin:0; background:var(--background); color:var(--foreground); font-family:'DM Sans',system-ui,sans-serif; }"
replacement = "body { margin:0; background:var(--background) url('/manus-storage/WhatsAppImage2026-09-16at12.59.07_a92a3ebd.jpeg') center/cover fixed no-repeat; color:var(--foreground); font-family:'DM Sans',system-ui,sans-serif; }"
if needle in text:
    css.write_text(text.replace(needle, replacement))
PY = root / 'client/index.html'
text = PY.read_text()
if '<link rel="icon"' not in text:
    text = text.replace('    <title>THE NEXT MIND — AI for Students</title>', '    <link rel="icon" type="image/jpeg" href="/manus-storage/WhatsAppImage2026-09-16at12.59.07_a92a3ebd.jpeg" />\n    <link rel="apple-touch-icon" href="/manus-storage/WhatsAppImage2026-09-16at12.59.07_a92a3ebd.jpeg" />\n    <title>THE NEXT MIND — AI for Students</title>')
PY.write_text(text)
