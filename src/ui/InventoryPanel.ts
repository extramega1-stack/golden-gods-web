import { describeItem, getItem } from '../data/items';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { ItemSlot } from '../types';

/** Panel de equipo y mochila en DOM: se abre con I. */
export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly goldEl: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private open = false;

  constructor(
    host: HTMLElement,
    private readonly onEquip: (uid: string) => void,
    private readonly onUnequip: (slot: ItemSlot) => void
  ) {
    this.root = document.createElement('div');
    this.root.id = 'inventory';
    this.root.className = 'panel';
    this.root.hidden = true;

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('span');
    title.textContent = 'EQUIPO Y MOCHILA';
    this.goldEl = document.createElement('span');
    this.goldEl.className = 'points';
    header.append(title, this.goldEl);

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.textContent = 'I para cerrar · clic en un objeto para equiparlo o quitarlo';

    this.body = document.createElement('div');
    this.body.className = 'panel-body';

    this.root.append(header, hint, this.body);
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
    this.goldEl.textContent = `Oro: ${player.gold}`;
    this.body.textContent = '';

    this.body.appendChild(this.sectionLabel('— Equipo —'));
    for (const slot of ['weapon', 'armor'] as ItemSlot[]) {
      const name = slot === 'weapon' ? 'Arma' : 'Armadura';
      const item = player.equipped[slot];
      if (item) {
        this.body.appendChild(
          this.row(`${name}: ${describeItem(item)}   [quitar]`, 'equipped', () =>
            this.onUnequip(slot)
          )
        );
      } else {
        this.body.appendChild(this.row(`${name}: (vacío)`, 'muted'));
      }
    }

    this.body.appendChild(this.sectionLabel(`— Mochila (${player.inventory.length}) —`));
    if (player.inventory.length === 0) {
      this.body.appendChild(this.row('(vacía)', 'muted'));
      return;
    }
    for (const item of player.inventory) {
      const kind = getItem(item.itemId).slot === 'weapon' ? 'arma' : 'armadura';
      this.body.appendChild(
        this.row(`${describeItem(item)}   [equipar ${kind}]`, 'item', () => this.onEquip(item.uid))
      );
    }
  }

  private sectionLabel(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'panel-section';
    el.textContent = text;
    return el;
  }

  private row(text: string, kind: string, onClick?: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `inv-row ${kind}`;
    el.textContent = text;
    if (onClick) {
      el.addEventListener('click', () => onClick());
    } else {
      el.disabled = true;
    }
    return el;
  }
}
