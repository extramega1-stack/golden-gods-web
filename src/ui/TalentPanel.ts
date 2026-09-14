import { TALENTS } from '../data/talents';
import type { PlayerUnit } from '../entities/PlayerUnit';

/** Panel de talentos en DOM: se abre con T y se gasta un punto por clic. */
export class TalentPanel {
  private readonly root: HTMLDivElement;
  private readonly pointsEl: HTMLSpanElement;
  private readonly rows: { id: string; el: HTMLButtonElement }[] = [];
  private open = false;

  constructor(
    host: HTMLElement,
    private readonly onSpend: (id: string) => void
  ) {
    this.root = document.createElement('div');
    this.root.id = 'talents';
    this.root.className = 'panel';
    this.root.hidden = true;

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('span');
    title.textContent = 'TALENTOS';
    this.pointsEl = document.createElement('span');
    this.pointsEl.className = 'points';
    header.append(title, this.pointsEl);

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.textContent = 'T para cerrar · clic para gastar un punto';

    this.root.append(header, hint);

    for (const node of TALENTS) {
      const row = document.createElement('button');
      row.className = 'talent-row';
      row.type = 'button';
      row.addEventListener('click', () => {
        this.onSpend(node.id);
      });
      this.root.appendChild(row);
      this.rows.push({ id: node.id, el: row });
    }

    host.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(player: PlayerUnit): void {
    this.open = !this.open;
    this.root.hidden = !this.open;
    if (this.open) {
      this.refresh(player);
    }
  }

  refresh(player: PlayerUnit): void {
    this.pointsEl.textContent = `Puntos: ${player.talentPoints}`;

    for (const row of this.rows) {
      const node = TALENTS.find((n) => n.id === row.id);
      if (!node) {
        continue;
      }
      const rank = player.talentRanks[node.id] ?? 0;
      const maxed = rank >= node.maxRank;
      const affordable = !maxed && player.talentPoints > 0;

      row.el.textContent = `${maxed ? '✔' : affordable ? '＋' : '·'} ${node.name} ${rank}/${node.maxRank} — ${node.description}`;
      row.el.classList.toggle('maxed', maxed);
      row.el.classList.toggle('poor', !maxed && !affordable);
    }
  }
}
