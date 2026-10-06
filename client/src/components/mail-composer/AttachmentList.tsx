import type { Attachment } from './types/mail';

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (attachment: Attachment) => void;
}

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (!attachments.length) return null;
  return <div className="attachment-list" aria-label="Attachments">
    {attachments.map((attachment) => <div className="attachment-row" key={attachment.id}>
      <span className={`file-badge ${attachment.type.startsWith('image/') ? 'image' : ''}`}>{attachment.type.startsWith('image/') ? 'IMG' : 'FILE'}</span>
      <span className="attachment-name">{attachment.name}<small>{attachment.status === 'uploading' ? `Uploading ${attachment.progress}%` : formatSize(attachment.size)}</small></span>
      {attachment.status === 'uploading' && <span className="attachment-progress"><i style={{ width: `${attachment.progress}%` }} /></span>}
      {attachment.status === 'error' && <span className="attachment-error">Upload failed</span>}
      <button type="button" className="icon-button" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment)}>×</button>
    </div>)}
  </div>;
}
