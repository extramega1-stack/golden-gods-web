import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { TalentNode } from '../types';

const DEPTH = 220000;

export class TalentPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly pointsText: Phaser.GameObjects.Text;
  private readonly rows: { node: TalentNode; text: Phaser.GameObjects.Text }[] = [];
  private open = false;
  private player?: Player;

  constructor(
    private readonly scene: Phaser.Scene,
    nodes: TalentNode[],
    onSpend: (id: string) => void
  ) {
    const w = 440;
    const h = 60 + nodes.length * 30;
    const bg = scene.add.rectangle(0, 0, w, h, 0x141018, 0.97).setStrokeStyle(2, 0x8a7a3f);
    const title = scene.add.text(-w / 2 + 16, -h / 2 + 14, 'TALENTOS  (T para cerrar)', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e8d9a0',
    });
    this.pointsText = scene.add
      .text(w / 2 - 16, -h / 2 + 14, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe58a',
      })
      .setOrigin(1, 0);

    const children: Phaser.GameObjects.GameObject[] = [bg, title, this.pointsText];

    nodes.forEach((node, i) => {
      const y = -h / 2 + 50 + i * 30;
      const text = scene.add
        .text(-w / 2 + 20, y, '', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#d8d2e6',
        })
        .setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        onSpend(node.id);
        if (this.player) {
          this.refresh(this.player);
        }
      });
      this.rows.push({ node, text });
      children.push(text);
    });

    this.container = scene.add
      .container(scene.scale.width / 2, scene.scale.height / 2, children)
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
    this.pointsText.setText(`Puntos: ${player.talentPoints}`);

    for (const { node, text } of this.rows) {
      const rank = player.talentRanks[node.id] ?? 0;
      const maxed = rank >= node.maxRank;
      const canBuy = !maxed && player.talentPoints > 0;
      const marker = maxed ? '[+]' : canBuy ? '[ ]' : ' · ';
      text.setText(`${marker} ${node.name} ${rank}/${node.maxRank} — ${node.description}`);
      text.setColor(maxed ? '#8ef0a0' : canBuy ? '#ffffff' : '#8b8598');
    }
  }

  private layout(): void {
    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
  }
}
