import { prepareImage, IMAGE_ACCEPT } from "@/lib/image";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { errMsg, inputCls } from "./ui";

type Props = {
  label: string; value: string; onChange: (url: string) => void;
  folder: "speakers" | "programs" | "seo";
  shape?: "wide" | "round"; maxDim?: number; hint?: string; forceWebSafe?: boolean;
};

/** Upload-first image input (click or drag & drop); pasting a link is a secondary option. */
export default function ImageField({ label, value, onChange, folder, shape = "wide", maxDim = 1600, hint, forceWebSafe }: Props) {
  const upload = trpc.admin.uploadImage.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const handle = async (file?: File) => {
    if (!file) return;
    setError(""); setBusy(true);
    try {
      const prepared = await prepareImage(file, { maxDim, forceWebSafe });
      const { url } = await upload.mutateAsync({ folder, ...prepared });
      onChange(url);
    } catch (e: any) { setError(errMsg(e)); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const box = shape === "round" ? "h-28 w-28 rounded-full" : "aspect-video w-full max-w-sm rounded-xl";
  return (
    <div className="text-sm text-slate-300">
      <div>{label}</div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className={`relative grid shrink-0 place-items-center overflow-hidden border border-dashed ${box} ${drag ? "border-yellow-300 bg-yellow-300/10" : "border-white/20 bg-[#101827]"}`}
        >
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex flex-col items-center gap-1 p-3 text-xs text-slate-400 hover:text-white">
              <ImagePlus className="h-5 w-5" />Upload or drop
            </button>
          )}
          {busy && <div className="absolute inset-0 grid place-items-center bg-black/60"><Loader2 className="h-5 w-5 animate-spin text-yellow-200" /></div>}
        </div>
        <div className="flex flex-col items-start gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"><ImagePlus className="h-4 w-4" />{value ? "Replace" : "Upload"}</button>
            {value && <button type="button" onClick={() => { onChange(""); setError(""); }} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove</button>}
          </div>
          <button type="button" onClick={() => setShowLink(v => !v)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"><Link2 className="h-3 w-3" />{showLink ? "Hide link field" : "Use an image link instead"}</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={e => handle(e.target.files?.[0])} />
      {showLink && <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="https://…" className={inputCls} />}
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
      {error && <div role="alert" className="mt-2 text-xs text-red-300">{error}</div>}
    </div>
  );
}
