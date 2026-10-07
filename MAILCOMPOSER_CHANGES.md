# Mail composer integration (built on the-next-minds-mailcomposer.zip)

- **Inbox:** the partnership status dropdown is gone. Partnership cards now match contact cards: a status badge plus buttons (Reply, Mark in review, Accept, Decline, Archive/Restore, Delete).
- **Reply** (contacts and partnerships) opens the same pop-up composer as the general message composer, with To, subject (`Re: …`) and a greeting + quoted original pre-filled. It uses its own one-off window, so it never touches the saved general draft. After a successful send, a New contact message becomes Read and a New partnership request becomes In review.
- **Acceptance email editor** now opens in the pop-up too (template mode: no recipients, "Save acceptance email" and "Restore default", merge-field chips, image/attachment buttons). The Email tab keeps a sandboxed live preview. The old inline editor and its localStorage draft were removed.
- **HTML view** (`</> HTML` button in the editor toolbar) in every editor: switch between visual and HTML source; formatting buttons are disabled while in HTML view; merge-field chips insert at the cursor in either view.
- Preview iframes are sandboxed (no scripts). Shared adapters + pop-up shell live in `components/mail-composer/useAdminMail.tsx`.
