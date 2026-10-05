/** Share the site via the native share sheet, falling back to copying the message. */
export async function shareSite(): Promise<"shared" | "copied" | "failed"> {
  const url = window.location.origin;
  const text = "THE NEXT MIND — free webinars, workshops and courses for students and young creatives.";
  try {
    if (navigator.share) { await navigator.share({ title: "THE NEXT MIND", text, url }); return "shared"; }
    await navigator.clipboard.writeText(`${text}\n${url}`); return "copied";
  } catch (e: any) { return e?.name === "AbortError" ? "failed" : "failed"; }
}
