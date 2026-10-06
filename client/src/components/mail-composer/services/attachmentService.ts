import type { Attachment, AttachmentService } from '../types/mail';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const mockAttachmentService: AttachmentService = {
  async upload(file) {
    await wait(650);
    return {
      id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      // The mock URL is intentionally replaceable by a host storage URL.
      url: URL.createObjectURL(file),
      status: 'uploaded',
      progress: 100,
    } satisfies Attachment;
  },
  async remove(attachment) {
    await wait(80);
    if (attachment.url?.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
  },
};
