import { describe, expect, it } from "vitest";
import { sniffImage } from "./image.js";

describe("sniffImage", () => {
  it("detects jpeg, png and webp by signature", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe("png");
    expect(sniffImage(Uint8Array.from([..."RIFF"].map(c => c.charCodeAt(0)), ) as any)).toBeNull(); // too short
    expect(sniffImage(Uint8Array.from([..."RIFF\0\0\0\0WEBP"].map(c => c.charCodeAt(0))))?.ext).toBe("webp");
  });
  it("rejects svg, html and gif", () => {
    for (const s of ["<svg xmlns", "<html>", "GIF89a"]) expect(sniffImage(Uint8Array.from([...s].map(c => c.charCodeAt(0))))).toBeNull();
  });
});
