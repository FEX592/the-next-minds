import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/seo";
import { PageShell } from "@/components/programs/SiteHeader";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { ArrowRight, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const SHARE_TEXT = `Wait… you’re a student, apprentice, or Pathfinder and you’re not yet in THE NEXT MIND?? 😒😂\n\nHmm… ahh. Something is not adding up. 👀\n\nTHE NEXT MIND is a free initiative by Coach Jam Digital Solutions, created to help young learners understand how to actually use AI for studying, research, creativity, projects, and building useful digital skills.\n\nThis one is not just “AI class.” You need to see what we’re cooking. 👀🔥\n\n📲 Explore programs here: ${typeof window !== "undefined" ? `${window.location.origin}/programs` : ""}\n\n#TheNextMind #JAMTOTHEWORLD`;

export default function Home() {
  usePageMeta({
    title: "THE NEXT MIND — AI for Students",
    description: "Technology and creativity for students and young creatives — webinars, workshops and courses from Coach Jam Digital Solutions, under JAM TO THE WORLD.",
  });
  const settings = trpc.public.siteSettings.useQuery().data;
  const communityLinks = trpc.public.communityLinks.useQuery().data ?? [];
  const [copied, setCopied] = useState(false);
  const joinLink = communityLinks[0]?.url;
  const featured = settings?.featuredProgram;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "THE NEXT MIND — AI for Students", text: SHARE_TEXT });
      else { await navigator.clipboard.writeText(SHARE_TEXT); setCopied(true); setTimeout(() => setCopied(false), 2400); }
    } catch {}
  };

  return (
    <PageShell>
      <section className="flex flex-col items-center py-14 text-center sm:py-20 animate-float-in">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-200/10 px-3 py-1.5 text-xs text-yellow-100">
          <Sparkles className="h-3.5 w-3.5" /> Learn. Create. Build.
        </div>
        <h1 className="font-display max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
          {settings?.heroHeadline || <>Your next move<br className="hidden sm:block" /> <span className="text-gradient">starts with AI.</span></>}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          {settings?.heroSubheadline || "A free initiative by Coach Jam Digital Solutions, under the ambition of JAM TO THE WORLD — webinars, workshops and courses for students and young creatives, all in one place."}
        </p>
        <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/programs" className="flex items-center justify-center gap-2 rounded-xl bg-yellow-300 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-yellow-200 active:scale-[.98]">
            Explore Programs <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={joinLink || "/programs"}
            target={joinLink ? "_blank" : undefined}
            rel={joinLink ? "noreferrer" : undefined}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 font-semibold text-white transition hover:border-yellow-300/60 hover:bg-white/5"
          >
            Join NEXT MIND
          </a>
        </div>
        <button onClick={share} className="mt-5 flex items-center gap-2 text-xs text-slate-400 transition hover:text-white">
          <Share2 className="h-3.5 w-3.5" /> {copied ? "Message copied" : "Share THE NEXT MIND"}
        </button>
      </section>

      {featured && (
        <section className="pb-16">
          <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[.18em] text-yellow-200 sm:text-left">Featured program</div>
          <div className="mx-auto max-w-md sm:mx-0">
            <ProgramCard program={featured} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
