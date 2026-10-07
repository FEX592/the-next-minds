import { useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { createGeneralMailSender, createMediaAttachmentService } from "./adapters";
import type { AttachmentService, EmailMessage, MailSender, SendResult } from "./types";
import "./styles.css";

export const EMAIL_BRANDING = { brandName: "THE NEXT MIND", tagline: "AI FOR STUDENTS" };

/**
 * One set of real adapters (send + upload) for every place the admin opens the composer:
 * general messages, contact / partnership replies and the acceptance template editor.
 */
export function useAdminMailServices(notify?: (message: string) => void) {
  const upload = trpc.admin.uploadMedia.useMutation();
  const send = trpc.admin.sendGeneralEmail.useMutation();
  const utils = trpc.useUtils();
  const latest = useRef({ upload, send, utils, notify });
  latest.current = { upload, send, utils, notify };

  return useMemo(() => {
    const uploader = { mutateAsync: (input: any) => latest.current.upload.mutateAsync(input) as Promise<any> };
    const sender: MailSender = {
      async send(message: EmailMessage): Promise<SendResult> {
        const result = await createGeneralMailSender({ mutateAsync: (input: any) => latest.current.send.mutateAsync(input) as Promise<any> }).send(message);
        if (result.ok) {
          const count = new Set([...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])]).size;
          latest.current.utils.admin.logs.invalidate();
          latest.current.notify?.(count > 1 ? `Sent to ${count} recipients.` : "Sent.");
        }
        return result;
      },
    };
    return {
      mailSender: sender,
      attachmentService: createMediaAttachmentService(uploader) as AttachmentService,
      /** Uploads linked to an email template (so they travel with that template's emails). */
      templateAttachmentService: (templateId?: number) => createMediaAttachmentService(uploader, { templateId }) as AttachmentService,
    };
  }, []);
}

/** Full-screen pop-up shell for the composer: dimmed backdrop, scrolls on small screens. */
export function ComposerPopup({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
