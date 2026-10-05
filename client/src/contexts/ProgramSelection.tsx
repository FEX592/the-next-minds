import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type PickedProgram = { id: number; slug: string; title: string };
const KEY = "nm-selected-programs";
export const MAX_SELECTED = 10;

type Ctx = { picked: PickedProgram[]; isPicked: (id: number) => boolean; toggle: (p: PickedProgram) => void; remove: (id: number) => void; clear: () => void };
const SelectionContext = createContext<Ctx | null>(null);

const valid = (p: any): p is PickedProgram => p && Number.isInteger(p.id) && typeof p.slug === "string" && typeof p.title === "string";

/** Programs the visitor has ticked. Survives navigation (and refresh) via sessionStorage. */
export function ProgramSelectionProvider({ children }: { children: React.ReactNode }) {
  const [picked, setPicked] = useState<PickedProgram[]>(() => {
    try { const v = JSON.parse(sessionStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter(valid).slice(0, MAX_SELECTED) : []; } catch { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(picked)); } catch {} }, [picked]);

  const toggle = useCallback((p: PickedProgram) => {
    setPicked(cur => {
      if (cur.some(x => x.id === p.id)) return cur.filter(x => x.id !== p.id);
      if (cur.length >= MAX_SELECTED) { toast.error(`You can register for up to ${MAX_SELECTED} programs at once.`); return cur; }
      return [...cur, { id: p.id, slug: p.slug, title: p.title }];
    });
  }, []);
  const remove = useCallback((id: number) => setPicked(cur => cur.filter(x => x.id !== id)), []);
  const clear = useCallback(() => setPicked([]), []);
  const value = useMemo<Ctx>(() => ({ picked, isPicked: id => picked.some(x => x.id === id), toggle, remove, clear }), [picked, toggle, remove, clear]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useProgramSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useProgramSelection must be used inside ProgramSelectionProvider");
  return ctx;
}
