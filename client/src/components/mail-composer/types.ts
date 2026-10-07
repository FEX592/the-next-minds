export type RecipientField = 'to' | 'cc' | 'bcc';

export interface Recipient {
  id: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

export interface Draft {
  id: string;
  updatedAt: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  attachments: Attachment[];
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface MailSender {
  send(message: EmailMessage): Promise<SendResult>;
}

export interface DraftService {
  load(): Promise<Draft | null>;
  save(draft: Draft): Promise<Draft>;
  remove(id: string): Promise<void>;
}

export interface AttachmentService {
  upload(file: File): Promise<Attachment>;
  remove(attachment: Attachment): Promise<void>;
}

export interface MailComposerServices {
  mailSender?: MailSender;
  draftService?: DraftService;
  attachmentService?: AttachmentService;
}
