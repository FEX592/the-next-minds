export const TYPE_LABEL: Record<string, string> = { WEBINAR: "Webinar", WORKSHOP: "Workshop", COURSE: "Course", CHALLENGE: "Challenge", TRAINING: "Training", COMMUNITY_INITIATIVE: "Community", OTHER: "Program" };
export const STATUS_LABEL: Record<string, string> = { UPCOMING: "Upcoming", ONGOING: "Live now", COMPLETED: "Completed" };
export const STATUS_STYLE: Record<string, string> = { UPCOMING: "border-yellow-300/30 bg-yellow-300/10 text-yellow-100", ONGOING: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100", COMPLETED: "border-white/15 bg-white/5 text-slate-300" };

export function formatWhen(date: Date | string | null | undefined) {
  if (!date) return "Date to be announced";
  return new Date(date).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}
export const formatDuration = (minutes: number | null | undefined) => !minutes ? null : minutes % 60 === 0 ? `${minutes / 60} hr` : minutes > 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`;
export const lines = (text: string | null | undefined) => (text ?? "").split("\n").map(l => l.trim()).filter(Boolean);
