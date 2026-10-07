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

/** Combine community links across several programs (per-program overrides first), de-duplicated. */
export function resolveCommunityMany(
  programs: { whatsappLinkOverride: string | null; telegramLinkOverride: string | null }[],
  links: LinkRow[],
): { whatsapp: string[]; telegram: string[] } {
  const whatsapp = new Set<string>(), telegram = new Set<string>();
  for (const program of programs) {
    const c = resolveCommunity(program, links);
    if (c.whatsapp) whatsapp.add(c.whatsapp);
    if (c.telegram) telegram.add(c.telegram);
  }
  return { whatsapp: [...whatsapp], telegram: [...telegram] };
}

export type ConfirmationProgram = { title: string; startAt: Date | null; durationMinutes: number | null; locationOrPlatform: string | null; joinLink?: string | null };

export function buildConfirmationEmail(input: {
  firstName: string;
  programs: ConfirmationProgram[];
  whatsapp: string[];
  telegram: string[];
}): { subject: string; body: string } {
  const { firstName, programs, whatsapp, telegram } = input;
  const block = (p: ConfirmationProgram) => {
    const when = formatProgramDate(p.startAt);
    return [
      `📌 ${p.title}`,
      when && `🗓 ${when}`,
      p.durationMinutes ? `⏱ ${p.durationMinutes} minutes` : undefined,
      p.locationOrPlatform && `📍 ${p.locationOrPlatform}`,
      p.joinLink ? `🔗 Join link: ${p.joinLink}` : undefined,
    ].filter(Boolean).join("\n");
  };
  const single = programs.length === 1;
  const parts = [
    `🎉 You're registered, ${firstName}!`,
    single ? `Your spot for ${programs[0].title} is confirmed.` : `Your spots are confirmed for ${programs.length} programs:`,
    ...programs.map(block),
    whatsapp.length ? `👥 WhatsApp community (announcements & reminders):\n${whatsapp.join("\n")}` : undefined,
    telegram.length ? `💬 Telegram community (live sessions & resources):\n${telegram.join("\n")}` : undefined,
    "Welcome to THE NEXT MIND — a JAM TO THE WORLD initiative by Coach Jam Digital Solutions.",
  ].filter(Boolean);
  return { subject: single ? `You're registered: ${programs[0].title}` : `You're registered for ${programs.length} NEXT MIND programs`, body: parts.join("\n\n") };
}
