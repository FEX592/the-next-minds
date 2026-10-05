import { X } from "lucide-react";
import { Link } from "wouter";
import { useProgramSelection } from "@/contexts/ProgramSelection";

/** Appears the moment at least one program is selected. */
export function SelectionBar() {
  const { picked, clear } = useProgramSelection();
  if (!picked.length) return null;
  return (
    <div className="animate-float-in fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-yellow-300/30 bg-[#0b1220]/95 p-3 shadow-2xl backdrop-blur">
        <div className="min-w-0 flex-1 pl-1">
          <div className="text-sm font-semibold text-white">{picked.length} program{picked.length === 1 ? "" : "s"} selected</div>
          <div className="truncate text-xs text-slate-400">{picked.map(p => p.title).join(", ")}</div>
        </div>
        <button type="button" onClick={clear} aria-label="Clear selection" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        <Link href="/register" className="rounded-xl bg-yellow-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-200">Register</Link>
      </div>
    </div>
  );
}
