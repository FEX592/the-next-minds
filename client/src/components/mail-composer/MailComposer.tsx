import { useEffect, useMemo, useRef, useState } from 'react';
import { AttachmentList } from './AttachmentList';
import { PreviewPane } from './PreviewPane';
import { RecipientInput } from './RecipientInput';
import { RichEditor } from './RichEditor';
import { localDraftService } from './draftService';
import type { Attachment, Draft, MailComposerServices } from './types';
import { generateEmailHtml, htmlToText, type EmailBranding } from './email';
import { isValidEmail } from './emailValidation';

interface MailComposerProps extends MailComposerServices {
  onClose?: () => void;
  /** Branding used by the generated recipient HTML and its preview. */
  branding?: EmailBranding;
  /** Pre-fills the To field — e.g. from a recipient picker the host already has. */
  initialTo?: string[];
  /** Pre-fills the subject field. */
  initialSubject?: string;
}

type SaveStatus = 'loading' | 'saved' | 'saving' | 'unsaved' | 'error';

const starterContent = '<p style="margin:0 0 16px;"><strong>Hi there,</strong></p><p style="margin:0 0 16px;">Write a thoughtful update, share a launch, or send a note that feels considered.</p><p style="margin:0;"><a href="https://example.com" style="color:#0d6d71;text-decoration:underline;">Explore the story →</a></p>';
const createDraft = (initialTo: string[] = [], initialSubject = ''): Draft => ({ id: `draft-${Date.now()}`, updatedAt: new Date().toISOString(), to: initialTo, cc: [], bcc: [], subject: initialSubject, content: starterContent, attachments: [] });

export function MailComposer({ mailSender, draftService = localDraftService, attachmentService, onClose, branding, initialTo, initialSubject }: MailComposerProps) {
  const [draft, setDraft] = useState<Draft>(() => createDraft(initialTo, initialSubject));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendState, setSendState] = useState<'idle' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState('');
  const [restored, setRestored] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const hasLoaded = useRef(false);

  if (!mailSender || !attachmentService) throw new Error('MailComposer requires real mailSender and attachmentService adapters in this project.');

  useEffect(() => {
    let active = true;
    draftService.load().then((saved) => {
      if (!active) return;
      // Don't clobber an explicit initialTo/initialSubject (e.g. recipients picked
      // in the host admin UI) with a stale unrelated draft from a previous session.
      if (saved && !initialTo?.length) {
        setDraft(saved);
        setShowCc(saved.cc.length > 0);
        setShowBcc(saved.bcc.length > 0);
        setRestored(true);
      }
      hasLoaded.current = true;
      setSaveStatus('saved');
    }).catch(() => { hasLoaded.current = true; setSaveStatus('error'); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftService]);

  useEffect(() => {
    if (!hasLoaded.current || saveStatus === 'loading' || sendState === 'success') return;
    setSaveStatus('unsaved');
    const timer = window.setTimeout(() => {
      setSaveStatus('saving');
      draftService.save(draft).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, draftService]);

  const generatedHtml = useMemo(() => generateEmailHtml(draft.content, draft.attachments, branding), [draft.content, draft.attachments, branding]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSendState('idle');
    setValidationError('');
  };

  const insertButton = () => {
    const label = window.prompt('Button label', 'Learn more');
    const url = label ? window.prompt('Button URL', 'https://') : null;
    if (!label || !url) return;
    document.execCommand('insertHTML', false, `<a href="${url}" style="display:inline-block;padding:12px 18px;background:#f6cf64;color:#0f1726;text-decoration:none;border-radius:8px;font-weight:bold;">${label}</a>`);
    const editor = document.querySelector('.rich-editor');
    if (editor) updateDraft({ content: editor.innerHTML });
  };

  const uploadFiles = async (files: FileList | null, insertImages = false) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const placeholders: Attachment[] = selected.map((file) => ({ id: `pending-${file.name}-${Date.now()}`, name: file.name, size: file.size, type: file.type || 'application/octet-stream', status: 'uploading', progress: 35 }));
    setDraft((current) => ({ ...current, attachments: [...current.attachments, ...placeholders] }));
    await Promise.all(selected.map(async (file, index) => {
      try {
        const uploaded = await attachmentService.upload(file);
        setDraft((current) => ({ ...current, attachments: current.attachments.map((item) => item.id === placeholders[index].id ? uploaded : item) }));
        if (insertImages && uploaded.url && uploaded.type.startsWith('image/')) {
          document.execCommand('insertHTML', false, `<img src="${uploaded.url}" alt="${uploaded.name}" style="display:block;max-width:100%;height:auto;border-radius:12px;margin:18px 0;" />`);
          const editor = document.querySelector('.rich-editor');
          if (editor) updateDraft({ content: editor.innerHTML });
        }
      } catch {
        setDraft((current) => ({ ...current, attachments: current.attachments.map((item) => item.id === placeholders[index].id ? { ...item, status: 'error', error: 'Upload failed' } : item) }));
      }
    }));
  };

  const removeAttachment = async (attachment: Attachment) => {
    await attachmentService.remove(attachment);
    updateDraft({ attachments: draft.attachments.filter((item) => item.id !== attachment.id) });
  };

  const manualSave = async () => {
    setSaveStatus('saving');
    try { await draftService.save(draft); setSaveStatus('saved'); } catch { setSaveStatus('error'); }
  };

  const send = async () => {
    if (!draft.to.length || draft.to.some((email) => !isValidEmail(email))) return setValidationError('Add at least one valid recipient in the To field.');
    if (!draft.subject.trim()) return setValidationError('Add a subject before sending.');
    if (!htmlToText(draft.content)) return setValidationError('Add some content before sending.');
    if (draft.attachments.some((attachment) => attachment.status === 'uploading')) return setValidationError('Wait for attachments to finish uploading.');
    setIsSending(true); setSendState('idle'); setSendError(''); setValidationError('');
    const result = await mailSender.send({ to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, html: generatedHtml, text: htmlToText(draft.content), attachments: draft.attachments });
    setIsSending(false);
    if (result.ok) { setSendState('success'); await draftService.remove(draft.id); }
    else { setSendState('error'); setSendError(result.error ?? 'Something went wrong while sending.'); }
  };

  const discard = async () => {
    await draftService.remove(draft.id);
    setDraft(createDraft()); setConfirmDiscard(false); setSaveStatus('saved'); setSendState('idle'); setRestored(false);
  };

  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved to drafts' : saveStatus === 'error' ? 'Save failed' : 'Changes not saved';

  return <div className={`composer-layout ${showPreview ? 'with-preview' : ''}`}>
    <section className={`composer-window ${isMaximized ? 'maximized' : ''}`} aria-label="New message">
      <header className="composer-header">
        <div className="composer-title"><span className="mail-mark">✦</span><div><span className="eyebrow">New message</span><h1>{draft.subject || 'Untitled note'}</h1></div></div>
        <div className="header-actions">
          <button type="button" className="header-action preview-toggle" onClick={() => setShowPreview((value) => !value)}>{showPreview ? 'Hide preview' : 'Preview'} <span>⌘ ↗</span></button>
          <button type="button" className="icon-button" title="Minimize" aria-label="Minimize" onClick={onClose}>−</button>
          <button type="button" className="icon-button" title="Maximize" aria-label="Maximize" onClick={() => setIsMaximized((value) => !value)}>□</button>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}>×</button>
        </div>
      </header>

      {restored && <div className="notice-banner"><span className="notice-icon">↗</span><span>Restored an unfinished draft from {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.</span><button type="button" onClick={() => setRestored(false)}>Dismiss</button></div>}
      {sendState === 'success' && <div className="success-banner"><span className="success-icon">✓</span><span>Your message was sent successfully.</span><button type="button" onClick={() => setSendState('idle')}>Compose another</button></div>}
      {(validationError || sendState === 'error') && <div className="error-banner"><span className="error-icon">!</span><span>{validationError || sendError}</span><button type="button" onClick={() => { setValidationError(''); setSendState('idle'); }}>Dismiss</button></div>}

      <div className="composer-body">
        <div className="recipient-row"><RecipientInput field="to" values={draft.to} onChange={(to) => updateDraft({ to })} /><div className="recipient-actions"><button type="button" className={showCc ? 'selected' : ''} onClick={() => setShowCc((value) => !value)}>Cc</button><button type="button" className={showBcc ? 'selected' : ''} onClick={() => setShowBcc((value) => !value)}>Bcc</button></div></div>
        {showCc && <RecipientInput field="cc" values={draft.cc} onChange={(cc) => updateDraft({ cc })} />}
        {showBcc && <RecipientInput field="bcc" values={draft.bcc} onChange={(bcc) => updateDraft({ bcc })} />}
        <div className="subject-field"><label htmlFor="subject">Subject</label><input id="subject" value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value })} placeholder="Add a clear subject" /></div>
        <RichEditor value={draft.content} onChange={(content) => updateDraft({ content })} onImageRequest={() => imageInputRef.current?.click()} onButtonRequest={insertButton} />
        <AttachmentList attachments={draft.attachments} onRemove={removeAttachment} />
      </div>

      <footer className="composer-footer">
        <div className="footer-left"><button type="button" className="send-button" onClick={send} disabled={isSending || sendState === 'success'}>{isSending ? <><span className="spinner" /> Sending</> : sendState === 'success' ? 'Sent ✓' : <>Send <span>↗</span></>}</button><button type="button" className="footer-icon" title="Add attachment" aria-label="Add attachment" onClick={() => attachmentInputRef.current?.click()}>⌕</button><button type="button" className="footer-icon" title="Insert image" aria-label="Insert image" onClick={() => imageInputRef.current?.click()}>▧</button></div>
        <div className="footer-right"><button type="button" className="save-draft" onClick={manualSave}>Save draft</button><span className={`draft-status ${saveStatus}`}><span className="status-dot" /> {saveLabel}</span><button type="button" className="discard-button" title="Discard draft" aria-label="Discard draft" onClick={() => setConfirmDiscard(true)}>⌫</button></div>
      </footer>
      <input ref={attachmentInputRef} type="file" multiple hidden onChange={(event) => uploadFiles(event.target.files)} />
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(event) => uploadFiles(event.target.files, true)} />
      {confirmDiscard && <div className="confirm-scrim"><div className="confirm-card"><span className="confirm-symbol">⌫</span><h3>Discard this draft?</h3><p>This will remove the local draft and cannot be undone.</p><div><button type="button" className="text-button" onClick={() => setConfirmDiscard(false)}>Keep editing</button><button type="button" className="danger-button" onClick={discard}>Discard draft</button></div></div></div>}
    </section>
    {showPreview && <PreviewPane html={generatedHtml} mode={previewMode} onModeChange={setPreviewMode} onClose={() => setShowPreview(false)} />}
  </div>;
}
