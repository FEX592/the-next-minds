import type { Attachment } from './types';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);

export const htmlToText = (html: string) =>
  html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const sanitizeEditorHtml = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, iframe, object, embed, form').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
      if (attribute.name === 'href' && !/^(https?:|mailto:|#)/i.test(attribute.value)) node.removeAttribute(attribute.name);
      if (attribute.name === 'src' && !/^(https?:|blob:|cid:)/i.test(attribute.value)) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

export interface EmailBranding {
  brandName?: string;
  tagline?: string;
  heroImageUrl?: string;
}

const DEFAULT_HERO_IMAGE_URL = 'https://the-next-minds.vercel.app/next-mind-logo.png';
const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

export const generateEmailHtml = (content: string, attachments: Attachment[], branding: EmailBranding = {}) => {
  const safeContent = sanitizeEditorHtml(content || '<p style="margin:0;">Your message starts here.</p>');
  const uploadedImages = attachments.filter((attachment) => attachment.status === 'uploaded' && attachment.type.startsWith('image/') && attachment.url && !safeContent.includes(attachment.url));
  const attachmentLinks = attachments.filter((attachment) => attachment.status === 'uploaded' && !attachment.type.startsWith('image/'));
  const imageMarkup = uploadedImages.length
    ? `<div style="margin:24px 0 0;">${uploadedImages.map((file) => `<img src="${escapeHtml(file.url ?? '')}" alt="${escapeHtml(file.name)}" style="display:block;max-width:100%;height:auto;border-radius:12px;margin:0 0 14px;" />`).join('')}</div>`
    : '';
  const attachmentMarkup = attachmentLinks.length
    ? `<div style="margin:24px 0 0;padding:14px 16px;background:#182337;border-radius:10px;font:14px Arial,sans-serif;color:#bdc8d9;"><strong style="color:#ffffff;">Attachments</strong><div style="margin-top:8px;">${attachmentLinks.map((file) => `<a href="${escapeHtml(file.url ?? '#')}" style="color:#f6cf64;text-decoration:underline;display:block;margin-top:5px;">${escapeHtml(file.name)}</a>`).join('')}</div></div>`
    : '';
  const brandName = escapeHtml(branding.brandName ?? 'THE NEXT MIND');
  const tagline = escapeHtml(branding.tagline ?? 'AI FOR STUDENTS');
  // Email clients cannot resolve app-relative paths. The host may override this
  // with its current PUBLIC_APP_URL-backed asset URL, but the default remains
  // deliverable when the feature is mounted before that adapter is connected.
  const heroImage = branding.heroImageUrl && isWebUrl(branding.heroImageUrl) ? branding.heroImageUrl : DEFAULT_HERO_IMAGE_URL;
  const heroMarkup = heroImage ? `<img src="${escapeHtml(heroImage)}" alt="${brandName} — ${tagline}" style="display:block;width:100%;max-height:340px;object-fit:cover;" />` : '';
  return `<!doctype html><html><body style="margin:0;background:#070b14;font-family:Arial,Helvetica,sans-serif;color:#e8eef9;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#070b14;width:100%;"><tr><td align="center" style="padding:24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#0f1726;border:1px solid #263650;border-radius:16px;overflow:hidden;width:100%;">${heroMarkup}<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#e8eef9;">${safeContent}${imageMarkup}${attachmentMarkup}</td></tr><tr><td style="padding:17px 28px;background:#0b1220;color:#7d8ca3;font:11px Arial,sans-serif;">${brandName} · ${tagline}</td></tr></table></td></tr></table></body></html>`;
};
