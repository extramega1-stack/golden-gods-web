import Phaser from 'phaser';
import { GODS, getGod, roleLabel } from '../data/gods';
import { SaveManager } from '../core/SaveManager';

export class HeroSelectScene extends Phaser.Scene {
  constructor() {
    super('HeroSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f0e13');
    this.render();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart());
  }

  private render(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.09, 'GOLDEN GODS WEB', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e8d9a0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.09 + 30, 'Elige tu dios — pulsa 1-4 o toca una carta', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#b9b1c9',
      })
      .setOrigin(0.5);

    const save = SaveManager.load();
    if (save) {
      const god = getGod(save.godId);
      const cont = this.add
        .text(width / 2, height * 0.09 + 58, `CONTINUAR — ${god.name} Nv${save.level} · ${save.gold} oro`, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#8ef0a0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cont.on('pointerdown', () => this.scene.start('World', { godId: save.godId, load: true }));
    }

    const cols = width >= 900 ? 4 : 2;
    const rows = Math.ceil(GODS.length / cols);
    const gap = 18;
    const cardW = Math.min(200, (width - gap * (cols + 1)) / cols);
    const cardH = Math.min(250, (height * 0.62 - gap * (rows + 1)) / rows);
    const gridH = rows * cardH + (rows - 1) * gap;
    const startY = height * 0.2 + (height * 0.72 - gridH) / 2;

    GODS.forEach((god, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = width / 2 - ((cols - 1) * (cardW + gap)) / 2 + col * (cardW + gap);
      const y = startY + cardH / 2 + row * (cardH + gap);

      const card = this.add
        .rectangle(x, y, cardW, cardH, 0x1b1724, 1)
        .setStrokeStyle(3, god.color)
        .setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.pick(god.id));

      this.add.circle(x, y - cardH / 2 + 52, 24, god.color, 1);
      this.add
        .text(x, y - cardH / 2 + 96, god.name, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y - cardH / 2 + 122, roleLabel(god.role), {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#b9b1c9',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 10, god.description, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#d8d2e6',
          align: 'center',
          wordWrap: { width: cardW - 24 },
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + cardH / 2 - 20, `[${i + 1}]`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#e8d9a0',
        })
        .setOrigin(0.5);

      this.input.keyboard?.on(`keydown-${i + 1}`, () => this.pick(god.id));
    });
  }

  private pick(id: string): void {
    this.scene.start('World', { godId: id });
  }
}
