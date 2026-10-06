import type { MailSender, EmailMessage, SendResult } from '../types/mail';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const mockMailSender: MailSender = {
  async send(message: EmailMessage): Promise<SendResult> {
    await wait(900);
    console.info('[mock-mail-sender] send payload', message);
    return { ok: true, messageId: `mock-${Date.now()}` };
  },
};
