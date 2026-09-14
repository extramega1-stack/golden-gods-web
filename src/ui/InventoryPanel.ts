import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { describeItem, getItem } from '../data/items';
import type { ItemSlot } from '../types';

const DEPTH = 220000;
const WIDTH = 470;

export class InventoryPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly rows: Phaser.GameObjects.Container;
  private readonly goldText: Phaser.GameObjects.Text;
  private open = false;
  private player?: Player;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onEquip: (uid: string) => void,
    private readonly onUnequip: (slot: ItemSlot) => void
  ) {
    const h = 400;
    const bg = scene.add.rectangle(0, 0, WIDTH, h, 0x141018, 0.97).setStrokeStyle(2, 0x8a7a3f);
    const title = scene.add.text(-WIDTH / 2 + 16, -h / 2 + 14, 'EQUIPO Y MOCHILA  (I para cerrar)', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e8d9a0',
    });
    this.goldText = scene.add
      .text(WIDTH / 2 - 16, -h / 2 + 14, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe58a',
      })
      .setOrigin(1, 0);
    this.rows = scene.add.container(0, 0);

    this.container = scene.add
      .container(scene.scale.width / 2, scene.scale.height / 2, [bg, title, this.goldText, this.rows])
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(player: Player): void {
    this.open = !this.open;
    this.container.setVisible(this.open);
    if (this.open) {
      this.refresh(player);
    }
  }

  refresh(player: Player): void {
    this.goldText.setText(`Oro: ${player.gold}`);
    this.rows.removeAll(true);

    let y = -160;
    const label = (text: string, color: string): void => {
      this.rows.add(
        this.scene.add.text(-WIDTH / 2 + 20, y, text, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color,
        })
      );
      y += 26;
    };
    const row = (text: string, color: string, onClick?: () => void): void => {
      const t = this.scene.add
        .text(-WIDTH / 2 + 20, y, text, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color,
        })
        .setInteractive({ useHandCursor: true });
      if (onClick) {
        t.on('pointerdown', () => {
          onClick();
          if (this.player) {
            this.refresh(this.player);
          }
        });
      }
      this.rows.add(t);
      y += 26;
    };

    label('— Equipo —', '#b9b1c9');
    for (const slot of ['weapon', 'armor'] as ItemSlot[]) {
      const name = slot === 'weapon' ? 'Arma' : 'Armadura';
      const item = player.equipped[slot];
      if (item) {
        row(`${name}: ${describeItem(item)}   [quitar]`, '#d8d2e6', () => this.onUnequip(slot));
      } else {
        row(`${name}: (vacío)`, '#6f6a7d');
      }
    }

    y += 8;
    label(`— Mochila (${player.inventory.length}) —`, '#b9b1c9');
    if (player.inventory.length === 0) {
      row('(vacía)', '#6f6a7d');
    } else {
      for (const item of player.inventory) {
        const slotName = getItem(item.itemId).slot === 'weapon' ? 'arma' : 'armadura';
        row(`${describeItem(item)}   [equipar ${slotName}]`, '#ffffff', () => this.onEquip(item.uid));
      }
    }
  }

  private layout(): void {
    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
  }
}
