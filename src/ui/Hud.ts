export interface HudView {
  title: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expNext: number;
  notice: string;
}

/** HUD en DOM: título, barras de HP/MP/EXP y estado. */
export class Hud {
  private readonly titleEl: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private readonly hpFill: HTMLElement;
  private readonly mpFill: HTMLElement;
  private readonly xpFill: HTMLElement;

  constructor(host: HTMLElement) {
    const root = document.createElement('div');
    root.id = 'hud';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'hud-title';

    const bars = document.createElement('div');
    bars.className = 'hud-bars';
    this.hpFill = Hud.addBar(bars, 'hp');
    this.mpFill = Hud.addBar(bars, 'mp');
    this.xpFill = Hud.addBar(bars, 'xp');

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'hud-status';

    root.append(this.titleEl, bars, this.statusEl);
    host.appendChild(root);
  }

  private static addBar(parent: HTMLElement, kind: string): HTMLElement {
    const bar = document.createElement('div');
    bar.className = `bar ${kind}`;
    const fill = document.createElement('i');
    bar.appendChild(fill);
    parent.appendChild(bar);
    return fill;
  }

  update(view: HudView): void {
    this.titleEl.textContent = view.title;
    this.hpFill.style.width = `${Hud.percent(view.hp, view.maxHp)}%`;
    this.mpFill.style.width = `${Hud.percent(view.mp, view.maxMp)}%`;
    this.xpFill.style.width = `${Hud.percent(view.exp, view.expNext || 1)}%`;
    this.statusEl.textContent = view.notice;
  }

  private static percent(value: number, max: number): number {
    if (max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (value / max) * 100));
  }
}
