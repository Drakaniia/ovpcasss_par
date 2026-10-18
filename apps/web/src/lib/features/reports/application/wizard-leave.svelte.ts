import { goto } from '$app/navigation';

import { toast } from '$lib/toast/toast.svelte';

/**
 * Leaving the wizard (UI phase 06 §4): Save draft / Discard / Stay, and the
 * one-shot bypass for navigations the page starts itself. Escape and the backdrop
 * both mean Stay, so no keystroke can discard work.
 */

export type NavigationTargetLike = { pathname: string; href: string } | null;

export class WizardLeave {
  open = $state(false);
  pending = $state<string | null>(null);

  private bypass = false;

  constructor(
    private readonly isDirty: () => boolean,
    private readonly saveDraft: () => Promise<boolean>,
    private readonly clearDirty: () => void,
    /** The wizard's own route: a navigation to it is a step change, not a leave. */
    private readonly ownPath: () => string = () => '/reports/new',
  ) {}

  /**
   * True when the author must choose. Step changes inside the wizard never ask,
   * so browser back/forward keeps moving between steps without data loss.
   */
  ask(to: NavigationTargetLike): boolean {
    if (this.bypass || !this.isDirty()) return false;
    if (!to || to.pathname === this.ownPath()) return false;

    this.pending = to.href;
    this.open = true;
    return true;
  }

  stay(): void {
    this.open = false;
    this.pending = null;
  }

  async saveAndExit(): Promise<void> {
    if (!(await this.saveDraft())) return;

    toast.success('Draft saved');
    await this.navigate('/reports?tab=drafts');
  }

  async saveAndLeave(): Promise<void> {
    const target = this.pending;
    const saved = await this.saveDraft();
    this.stay();
    if (!saved || !target) return;

    await this.navigate(target);
  }

  async discardAndLeave(): Promise<void> {
    const target = this.pending;
    this.stay();
    if (!target) return;

    this.clearDirty();
    await this.navigate(target);
  }

  /** Navigate on purpose, without the leave prompt. */
  async navigate(target: string): Promise<void> {
    this.bypass = true;
    await goto(target);
    this.bypass = false;
  }
}
