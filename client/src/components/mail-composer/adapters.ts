import type { Attachment, AttachmentService, EmailMessage, MailSender, SendResult } from "./types";

/**
 * Real AttachmentService: uploads through the existing admin.uploadMedia
 * procedure (base64 over tRPC, same path the acceptance-email editor already
 * uses), not a browser blob: URL. The returned Attachment.id is the server's
 * numeric media id (stringified) so MailSender below can recover it.
 */
export function createMediaAttachmentService(uploadMedia: {
  mutateAsync: (input: { filename: string; mimeType: string; dataBase64: string; placement: "INLINE" | "ATTACHMENT"; templateId?: number }) => Promise<{ id?: number; url: string; filename: string; mimeType: string }>;
}, options: { templateId?: number } = {}): AttachmentService {
  return {
    async upload(file: File): Promise<Attachment> {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const isImage = file.type.startsWith("image/");
      const result = await uploadMedia.mutateAsync({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
        // Images inserted in the body are linked, not CID-attached (Brevo doesn't
        // support inline CID — see the earlier SEO/email work); everything else
        // is a real attachment delivered via the host's sender.
        placement: isImage ? "INLINE" : "ATTACHMENT",
        templateId: options.templateId,
      });
      return {
        id: result.id != null ? String(result.id) : `local-${Date.now()}`,
        name: result.filename,
        size: file.size,
        type: result.mimeType,
        url: result.url,
        status: "uploaded",
        progress: 100,
      };
    },
    async remove() {
      // No host endpoint to delete uploaded media yet; the file stays in
      // storage but is simply no longer referenced by this draft/message.
    },
  };
}

/**
 * Real MailSender: adapts the composer's single-message/{to,cc,bcc} shape to
 * the host's existing sendGeneralEmail, which fans out one individually
 * addressed email per recipient (not one email with a shared To/Cc header).
 * To/Cc/Bcc are therefore merged into one deduplicated recipient list here —
 * there's no shared envelope for Cc/Bcc to meaningfully apply to once every
 * recipient gets their own separate send.
 */
export function createGeneralMailSender(sendGeneralEmail: {
  mutateAsync: (input: { recipients: string[]; subject: string; body: string; htmlBody?: string; mediaIds?: number[] }) => Promise<{ processed: number; sent: number; failed: number }>;
}): MailSender {
  return {
    async send(message: EmailMessage): Promise<SendResult> {
      const recipients = Array.from(new Set([...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])]));
      const mediaIds = (message.attachments ?? [])
        .filter((a) => a.status === "uploaded" && /^\d+$/.test(a.id))
        .map((a) => Number(a.id));
      try {
        const out = await sendGeneralEmail.mutateAsync({
          recipients,
          subject: message.subject,
          body: message.text || "",
          htmlBody: message.html,
          mediaIds: mediaIds.length ? mediaIds : undefined,
        });
        if (out.failed > 0 && out.sent === 0) return { ok: false, error: `All ${out.failed} send(s) failed.` };
        return { ok: true, messageId: `batch-${Date.now()}-sent-${out.sent}-failed-${out.failed}` };
      } catch (err: any) {
        return { ok: false, error: err?.message || "Send failed." };
      }
    },
  };
}
