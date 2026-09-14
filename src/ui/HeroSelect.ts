import { GODS, getGod, roleLabel } from '../data/gods';
import type { SaveData } from '../core/SaveManager';

/** Pantalla de selección de dios en DOM. */
export class HeroSelect {
  private readonly root: HTMLDivElement;

  constructor(
    host: HTMLElement,
    onSelect: (godId: string) => void,
    save: SaveData | null,
    onContinue: () => void
  ) {
    this.root = document.createElement('div');
    this.root.id = 'menu';

    const title = document.createElement('h1');
    title.textContent = 'GOLDEN GODS';

    const subtitle = document.createElement('p');
    subtitle.className = 'menu-subtitle';
    subtitle.textContent = 'Elige tu dios — pulsa 1-4 o toca una carta';

    this.root.append(title, subtitle);

    if (save) {
      const god = getGod(save.godId);
      const resume = document.createElement('button');
      resume.type = 'button';
      resume.className = 'continue-button';
      resume.textContent = `CONTINUAR — ${god.name} · Nv ${save.level} · ${save.gold} oro`;
      resume.addEventListener('click', () => onContinue());
      this.root.appendChild(resume);
    }

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    GODS.forEach((god, index) => {
      const card = document.createElement('button');
      card.className = 'god-card';
      card.type = 'button';
      card.style.borderColor = `#${god.color.toString(16).padStart(6, '0')}`;

      const swatch = document.createElement('span');
      swatch.className = 'god-swatch';
      swatch.style.background = `#${god.color.toString(16).padStart(6, '0')}`;

      const name = document.createElement('strong');
      name.textContent = god.name;

      const role = document.createElement('span');
      role.className = 'god-role';
      role.textContent = roleLabel(god.role);

      const description = document.createElement('span');
      description.className = 'god-desc';
      description.textContent = god.description;

      const key = document.createElement('span');
      key.className = 'god-key';
      key.textContent = `[${index + 1}]`;

      card.append(swatch, name, role, description, key);
      card.addEventListener('click', () => onSelect(god.id));
      grid.appendChild(card);
    });

    this.root.append(grid);
    host.appendChild(this.root);

    window.addEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const index = Number(event.key) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= GODS.length) {
      return;
    }
    const cards = this.root.querySelectorAll<HTMLButtonElement>('.god-card');
    cards[index]?.click();
  };

  hide(): void {
    this.root.remove();
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
