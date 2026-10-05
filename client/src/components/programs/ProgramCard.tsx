import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { formatWhen, STATUS_LABEL, STATUS_STYLE, TYPE_LABEL } from "./format";
import { SelectProgramButton } from "./SelectProgramButton";

export type ProgramSummary = { id: number; slug: string; title: string; shortDescription: string | null; coverImageUrl: string | null; type: string; status: string; startAt: Date | null; registrationOpen: boolean };

export function ProgramCard({ program }: { program: ProgramSummary }) {
  return (
    <div className="glass group flex flex-col overflow-hidden rounded-3xl transition hover:border-yellow-300/40">
      <Link href={`/programs/${program.slug}`} className="flex flex-1 flex-col">
        {program.coverImageUrl && <img src={program.coverImageUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />}
        <div className="flex flex-1 flex-col p-5 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em]">
            <span className={`rounded-full border px-2.5 py-1 ${STATUS_STYLE[program.status]}`}>{STATUS_LABEL[program.status]}</span>
            <span className="text-slate-400">{TYPE_LABEL[program.type] ?? program.type}</span>
          </div>
          <h3 className="font-display mt-3 text-xl font-semibold leading-snug text-white">{program.title}</h3>
          {program.shortDescription && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{program.shortDescription}</p>}
          <div className="mt-auto flex items-center justify-between pt-5 text-sm text-slate-300">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-yellow-200" />{formatWhen(program.startAt)}</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
      <div className="px-5 pb-5">
        {program.registrationOpen ? <SelectProgramButton program={program} fullWidth /> : <div className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-slate-500">{program.status === "COMPLETED" ? "Completed" : "Registration closed"}</div>}
      </div>
    </div>
  );
}
