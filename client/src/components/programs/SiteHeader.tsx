import { Link } from "wouter";

const BRAND = "/next-mind-logo.png";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#05070d] grid-lines">
      <div className="fixed inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${BRAND})` }} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(42,119,202,.24),transparent_34%),radial-gradient(circle_at_85%_65%,rgba(247,193,22,.14),transparent_34%),linear-gradient(180deg,rgba(3,6,13,.3),rgba(3,6,13,.92))]" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="h-10 w-10 overflow-hidden rounded-xl border border-white/20"><img src={BRAND} alt="THE NEXT MIND logo" className="h-full w-full object-cover" /></span>
            <span className="font-display text-sm font-semibold tracking-[.22em] text-white">THE NEXT MIND</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-300">
            <Link href="/programs" className="hover:text-white">Programs</Link>
            <Link href="/partner" className="hidden hover:text-white sm:inline">Partner</Link>
            <Link href="/contact" className="hidden hover:text-white sm:inline">Contact</Link>
            <Link href="/" className="rounded-full bg-yellow-300 px-4 py-2 font-semibold text-slate-950 hover:bg-yellow-200">Join</Link>
          </nav>
        </header>
        {children}
        <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:justify-between"><span>THE NEXT MIND · JAM TO THE WORLD · Coach Jam Digital Solutions</span><span className="flex gap-4"><Link href="/programs" className="hover:text-white">Programs</Link><Link href="/partner" className="hover:text-white">Partner with us</Link><Link href="/contact" className="hover:text-white">Contact</Link></span></footer>
      </div>
    </main>
  );
}
