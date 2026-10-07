import type { Draft, DraftService } from './types';

const STORAGE_KEY = 'custom-mail-composer:draft';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const localDraftService: DraftService = {
  async load() {
    await wait(180);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  },
  async save(draft) {
    await wait(320);
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return saved;
  },
  async remove() {
    await wait(120);
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

/** For one-off windows (replies, template editing) that must not touch the shared local draft. */
export const noopDraftService: DraftService = {
  async load() { return null; },
  async save(draft) { return { ...draft, updatedAt: new Date().toISOString() }; },
  async remove() {},
};
