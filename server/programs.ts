// Pure helpers for the programs system (no DB / env imports so they stay unit-testable).

export type ProgramStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export type RegistrationGate = {
  status: ProgramStatus;
  registrationEnabled: boolean;
  registrationDeadline: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
};

export type RegistrationState =
  | { open: true }
  | { open: false; reason: "unavailable" | "disabled" | "completed" | "deadline_passed" };

export function registrationState(p: RegistrationGate, now: Date = new Date()): RegistrationState {
  if (!p.publishedAt || p.archivedAt) return { open: false, reason: "unavailable" };
  if (!p.registrationEnabled) return { open: false, reason: "disabled" };
  if (p.status === "COMPLETED") return { open: false, reason: "completed" };
  if (p.registrationDeadline && p.registrationDeadline.getTime() < now.getTime()) return { open: false, reason: "deadline_passed" };
  return { open: true };
}

export const REGISTRATION_CLOSED_MESSAGE: Record<Exclude<RegistrationState, { open: true }>["reason"], string> = {
  unavailable: "This program is not available.",
  disabled: "Registration for this program is currently closed.",
  completed: "This program has ended, so registration is closed.",
  deadline_passed: "The registration deadline for this program has passed.",
};

type LinkRow = { platform: string; url: string; isActive: boolean };

/** Per-program override wins; otherwise first active site-wide link for the platform (rows pre-sorted by displayOrder). */
export function resolveCommunity(
  program: { whatsappLinkOverride: string | null; telegramLinkOverride: string | null },
  links: LinkRow[],
): { whatsapp?: string; telegram?: string } {
  const pick = (platform: string) => links.find(l => l.isActive && l.platform.toLowerCase() === platform)?.url;
  return {
    whatsapp: program.whatsappLinkOverride || pick("whatsapp") || undefined,
    telegram: program.telegramLinkOverride || pick("telegram") || undefined,
  };
}

/** Strip internal/admin-only fields before a program row goes to the public API. */
export function toPublicProgram<T extends Record<string, any>>(p: T) {
  const { createdBy, updatedBy, whatsappLinkOverride, telegramLinkOverride, ...rest } = p;
  return rest as Omit<T, "createdBy" | "updatedBy" | "whatsappLinkOverride" | "telegramLinkOverride">;
}

export function formatProgramDate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return `${date.toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" })} (WAT)`;
}

export function buildConfirmationEmail(input: {
  firstName: string;
  program: { title: string; startAt: Date | null; durationMinutes: number | null; locationOrPlatform: string | null };
  joinLink?: string | null;
  whatsapp?: string;
  telegram?: string;
}): { subject: string; body: string } {
  const { firstName, program, joinLink, whatsapp, telegram } = input;
  const when = formatProgramDate(program.startAt);
  const details = [
    `📌 ${program.title}`,
    when && `🗓 ${when}`,
    program.durationMinutes ? `⏱ ${program.durationMinutes} minutes` : undefined,
    program.locationOrPlatform && `📍 ${program.locationOrPlatform}`,
  ].filter(Boolean).join("\n");
  const parts = [
    `🎉 You're registered, ${firstName}!`,
    `Your spot for ${program.title} is confirmed.`,
    details,
    joinLink ? `🔗 Join link:\n${joinLink}` : undefined,
    whatsapp ? `👥 WhatsApp community (announcements & reminders):\n${whatsapp}` : undefined,
    telegram ? `💬 Telegram community (live sessions & resources):\n${telegram}` : undefined,
    "Welcome to THE NEXT MIND — a JAM TO THE WORLD initiative by Coach Jam Digital Solutions.",
  ].filter(Boolean);
  return { subject: `You're registered: ${program.title}`, body: parts.join("\n\n") };
}
