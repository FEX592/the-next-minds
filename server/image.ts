// Pure helper: identify an image by its magic bytes (never trust the client-declared type).
export function sniffImage(buf: Uint8Array): { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return { mime: "image/png", ext: "png" };
  if (buf.length >= 12 && String.fromCharCode(...Array.from(buf.slice(0, 4))) === "RIFF" && String.fromCharCode(...Array.from(buf.slice(8, 12))) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}
