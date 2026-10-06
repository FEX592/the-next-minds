import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { MailComposer } from "./MailComposer";
import type { Attachment, Draft, EmailMessage, SendResult } from "./types/mail";
import { htmlToText } from "./utils/email";

const draftService = {
  async load(): Promise<Draft | null> { return null; },
  async save(draft: Draft): Promise<Draft> { return draft; },
  async remove(): Promise<void> {},
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export function HostMailComposer({
  initialDraft,
  onDraftChange,
  onGeneratedHtmlChange,
  onClose,
  showFooter = true,
  recipientOverride,
}: {
  initialDraft?: Partial<Pick<Draft, "to" | "cc" | "bcc" | "subject" | "content" | "attachments">>;
  onDraftChange?: (draft: Draft) => void;
  onGeneratedHtmlChange?: (html: string) => void;
  onClose?: () => void;
  showFooter?: boolean;
  recipientOverride?: string[];
}) {
  const sendGeneralEmail = trpc.admin.sendGeneralEmail.useMutation();
  const uploadMedia = trpc.admin.uploadMedia.useMutation();

  const attachmentService = useMemo(() => ({
    async upload(file: File): Promise<Attachment> {
      const placement = file.type.startsWith("image/") ? "INLINE" : "ATTACHMENT";
      const dataBase64 = await readAsDataUrl(file);
      const uploaded = await uploadMedia.mutateAsync({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
        placement,
      });
      return {
        id: String(uploaded.id ?? `${Date.now()}-${file.name}`),
        name: uploaded.filename,
        size: file.size,
        type: uploaded.mimeType,
        url: uploaded.url,
        status: "uploaded",
        progress: 100,
      };
    },
    async remove(): Promise<void> {},
  }), [uploadMedia]);

  const mailSender = useMemo(() => ({
    async send(message: EmailMessage): Promise<SendResult> {
      const mediaIds = (message.attachments ?? [])
        .map((attachment) => Number(attachment.id))
        .filter((id) => Number.isInteger(id) && id > 0);
      const result = await sendGeneralEmail.mutateAsync({
        recipients: message.to,
        cc: message.cc ?? [],
        bcc: message.bcc ?? [],
        subject: message.subject,
        body: message.text || htmlToText(message.html),
        htmlBody: message.html,
        mediaIds,
      });
      return result.failed === 0
        ? { ok: true, messageId: result.results?.[0]?.recipient }
        : { ok: false, error: result.results?.find((item: { sent: boolean; error?: string }) => !item.sent)?.error ?? "One or more messages failed." };
    },
  }), [sendGeneralEmail]);

  return (
    <MailComposer
      mailSender={mailSender}
      draftService={draftService}
      attachmentService={attachmentService}
      initialDraft={initialDraft}
      onDraftChange={onDraftChange}
      onGeneratedHtmlChange={onGeneratedHtmlChange}
      onClose={onClose}
      showFooter={showFooter}
      recipientOverride={recipientOverride}
      branding={{ brandName: "THE NEXT MIND", tagline: "AI FOR STUDENTS", heroImageUrl: `${window.location.origin}/next-mind-logo.png` }}
    />
  );
}
