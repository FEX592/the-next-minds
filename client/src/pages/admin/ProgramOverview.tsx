import { trpc } from "@/lib/trpc";

/** Program counts for the dashboard (PRD §14). */
export default function ProgramOverview() {
  const q = trpc.admin.programs.useQuery();
  const inbox = trpc.admin.inboxCounts.useQuery();
  const live = (q.data ?? []).filter(p => p.publishedAt && !p.archivedAt);
  const count = (status: string, webinar?: boolean) => live.filter(p => p.status === status && (webinar === undefined || (p.type === "WEBINAR") === webinar)).length;
  const items: [string, number][] = [["Upcoming programs", count("UPCOMING")], ["Ongoing programs", count("ONGOING")], ["Completed programs", count("COMPLETED")], ["Upcoming webinars", count("UPCOMING", true)], ["Drafts", (q.data ?? []).filter(p => !p.publishedAt && !p.archivedAt).length], ["New partnership requests", inbox.data?.newPartnerships ?? 0], ["New contact messages", inbox.data?.newContacts ?? 0]];
  return (
    <div className="mt-8">
      <h2 className="font-display text-sm font-semibold uppercase tracking-[.16em] text-slate-400">Programs</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {items.map(([label, n]) => <div key={label} className="glass rounded-2xl p-4"><div className="text-2xl font-semibold text-white">{q.isLoading ? "–" : n}</div><div className="mt-1 text-xs text-slate-400">{label}</div></div>)}
      </div>
    </div>
  );
}
