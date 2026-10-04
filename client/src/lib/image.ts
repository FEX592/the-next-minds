export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const TARGET_BYTES = 2.5 * 1024 * 1024; // server cap is 3 MB; request bodies must stay under the host's ~4.5 MB limit once base64-encoded

const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error("Couldn't read the file.")); r.readAsDataURL(blob); });
const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a valid image.")); }; img.src = url; });
const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));

/**
 * Validates, downsizes and re-encodes an image in the browser so phone photos upload fast and fit the request limit.
 * Small PNG/JPEG/WebP files that already fit are sent untouched. `forceWebSafe` re-encodes WebP to JPEG (social crawlers).
 */
export async function prepareImage(file: File, opts: { maxDim: number; forceWebSafe?: boolean }) {
  if (!ALLOWED.includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is too large (20 MB max).");
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  let scale = Math.min(1, opts.maxDim / longest);
  const needsReencode = scale < 1 || file.size > 900 * 1024 || (opts.forceWebSafe && file.type === "image/webp");
  if (!needsReencode) return { filename: file.name, dataBase64: await readAsDataUrl(file) };

  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); // JPEG has no transparency
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.88, 0.8, 0.7, 0.6]) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= TARGET_BYTES) return { filename: file.name.replace(/\.[^.]+$/, "") + ".jpg", dataBase64: await readAsDataUrl(blob) };
    }
    scale *= 0.75;
  }
  throw new Error("Couldn't shrink that image enough. Try a smaller one.");
}
