from pathlib import Path
p = Path('/home/ubuntu/work-next-mind/client/src/pages/Admin.tsx')
s = p.read_text()
replacements = {
    'Gmail sender configuration': 'Email automation configuration',
    'your-gmail@gmail.com': 'hello@example.com',
    'Gmail OAuth': 'Manus Email Automation API',
    'Messages are sent through the connected Gmail account.': 'Messages are sent through the configured Manus Email Automation API.',
    'Gmail connection': 'Email automation connection',
    'Connect the Gmail account that should send acceptance and broadcast emails.': 'Configure the Manus Email Automation API endpoint and key for acceptance and broadcast emails.',
    'Google admin sign-in': 'Local administrator sign-in',
    'Google authentication and Gmail sending use separate consent scopes.': 'Administrator access uses local email/password accounts and one-time invites.',
    'Test Gmail connection': 'Test email automation connection',
    'Send a real test message through the connected Gmail account.': 'Send a real test message through the configured email automation service.',
    'Connect Gmail': 'Configure API',
    'Reconnect Gmail': 'Update API key',
    'href="/api/auth/gmail/start"': 'href="#email-automation-api"',
    'provider:"gmail"': 'provider:"manus-email-automation",apiKey: window.prompt("Manus Email Automation API key (leave blank to keep the existing key)") || undefined',
    'Invitees can authenticate with Google or Manus.': 'Invitees create a local email/password account using the one-time link.',
    'The invite works with Google authentication and Manus sign-in.': 'The invite works with a local email/password account.',
    'Manus': 'Local account',
}
for old, new in replacements.items():
    s = s.replace(old, new)
p.write_text(s)
