from pathlib import Path
replacements = {
    'Local account Email Automation API': 'Email Automation API',
    'configured Local account Email Automation API': 'configured Email Automation API',
    'Local administrator sign-in': 'Administrator sign-in',
    'Invitees create a local email/password account using the one-time link.': 'Invitees create an account using the one-time link.',
    'The invite works with a local email/password account.': 'The invite works with a secure account.',
    'admin.loginMethod||"Local account"': 'admin.loginMethod||"Account"',
    'Access to this dashboard requires a local account. Continue to sign in with your project credentials.': 'Access to this dashboard requires an account. Continue to sign in with your project credentials.',
}
for name in ['client/src/pages/Admin.tsx', 'client/src/components/DashboardLayout.tsx']:
    p=Path('/home/ubuntu/the-next-mind')/name
    s=p.read_text()
    for old,new in replacements.items(): s=s.replace(old,new)
    p.write_text(s)
p=Path('/home/ubuntu/the-next-mind/client/src/pages/Auth.tsx')
s=p.read_text()
for old,new in {
    'Create your invited account':'Create your account',
    'This invitation creates a password-protected administrator account.':'This invitation creates a password-protected account.',
    'No administrator exists yet. Create the first local administrator account now.':'No administrator exists yet. Create the first administrator account now.',
    'Sign in locally':'Sign in',
    'Use the local email address and password configured for this project.':'Use your email address and password to continue.',
}.items(): s=s.replace(old,new)
p.write_text(s)
