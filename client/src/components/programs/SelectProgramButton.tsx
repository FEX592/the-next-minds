import { Check, Plus } from "lucide-react";
import { useProgramSelection } from "@/contexts/ProgramSelection";

/** Toggle a program in/out of the visitor's registration selection. */
export function SelectProgramButton({ program, fullWidth }: { program: { id: number; slug: string; title: string }; fullWidth?: boolean }) {
  const { isPicked, toggle } = useProgramSelection();
  const on = isPicked(program.id);
  return (
    <button
      type="button" aria-pressed={on} onClick={() => toggle(program)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[.98] ${fullWidth ? "w-full" : ""} ${on ? "bg-yellow-300 text-slate-950 hover:bg-yellow-200" : "border border-yellow-300/50 text-yellow-100 hover:bg-yellow-300/10"}`}
    >
      {on ? <><Check className="h-4 w-4" /> Selected</> : <><Plus className="h-4 w-4" /> Select to register</>}
    </button>
  );
}
