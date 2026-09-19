from pathlib import Path
p = Path('/home/ubuntu/work-next-mind/client/src/pages/Admin.tsx')
s = p.read_text()
s = s.replace('Google admin authentication and Gmail sending use separate consent scopes.', 'Administrator access uses local email/password accounts and one-time invites.')
s = s.replace('hasGmailOAuth', 'hasApiKey')
s = s.replace('googleSignInConfigured', 'emailAutomationUrlConfigured')
s = s.replace('Local account Email Automation API key', 'Manus Email Automation API key')
p.write_text(s)
