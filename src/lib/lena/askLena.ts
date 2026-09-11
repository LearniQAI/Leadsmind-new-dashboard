/**
 * Cross-component trigger for the real, live LENA chat widget (LENAChat.tsx,
 * mounted once in DefaultWrapper). There is no page-scoped "LENA Page Help
 * panel" in this codebase yet (see PRD_Sidebar_Hover_Panels.md Section 5) —
 * this opens the actual assistant that does exist and asks it a real
 * question, rather than linking to something that isn't built.
 */
export const LENA_ASK_EVENT = 'lena:ask';

export interface LenaAskDetail {
  question: string;
}

export function askLena(question: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<LenaAskDetail>(LENA_ASK_EVENT, { detail: { question } }));
}
