import { useEffect } from "react";

function setMeta(attr: "name" | "property", key: string, content: string | undefined | null) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

/** Client-side meta for the current page. Crawlers that don't run JS still need server/edge injection (Phase 5). */
export function usePageMeta(meta: { title?: string | null; description?: string | null; image?: string | null }) {
  const { title, description, image } = meta;
  useEffect(() => {
    const previous = document.title;
    if (title) document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", window.location.href);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    return () => { document.title = previous; };
  }, [title, description, image]);
}
