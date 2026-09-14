interface Action {
  label: string;
  onClick: () => void;
}

/** Panel de partida en DOM: se abre con O. */
export class SavePanel {
  private readonly root: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private open = false;

  constructor(host: HTMLElement, actions: Action[]) {
    this.root = document.createElement('div');
    this.root.id = 'save';
    this.root.className = 'panel';
    this.root.hidden = true;

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('span');
    title.textContent = 'PARTIDA';
    header.appendChild(title);

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.textContent = 'O para cerrar · el juego guarda solo cada 15 s';

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'panel-status';

    this.root.append(header, hint);

    for (const action of actions) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'inv-row item';
      row.textContent = action.label;
      row.addEventListener('click', () => action.onClick());
      this.root.appendChild(row);
    }

    this.root.appendChild(this.statusEl);
    host.appendChild(this.root);
  }

  get element(): HTMLDivElement {
    return this.root;
  }

  isOpen(): boolean {
    return this.open;
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  toggle(): void {
    this.open = !this.open;
    this.root.hidden = !this.open;
  }
}
