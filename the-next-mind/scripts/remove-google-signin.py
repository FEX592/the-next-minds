from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text()
old='''{!user?<div className="mt-7 grid gap-3"><a href={`/api/auth/google/start?returnTo=${encodeURIComponent(location)}`} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-semibold text-slate-950"><span className="text-lg font-bold">G</span> Sign in with Gmail</a><button onClick={()=>startLogin(location)} className="w-full rounded-xl border border-white/10 px-4 py-3.5 font-semibold text-slate-200 hover:bg-white/5">Use Local account sign-in instead</button></div>:'''
new='''{!user?<div className="mt-7 grid gap-3"><button onClick={()=>startLogin(location)} className="w-full rounded-xl bg-yellow-300 px-4 py-3.5 font-semibold text-slate-950 hover:bg-yellow-200">Create or sign in with a local account</button></div>:'''
if old not in s:
    raise SystemExit('Google sign-in block not found')
p.write_text(s.replace(old,new))
