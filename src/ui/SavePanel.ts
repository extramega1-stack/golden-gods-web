import Phaser from 'phaser';

const DEPTH = 220000;
const WIDTH = 480;
const HEIGHT = 340;

interface Action {
  label: string;
  onClick: () => void;
}

export class SavePanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly statusText: Phaser.GameObjects.Text;
  private open = false;

  constructor(private readonly scene: Phaser.Scene, actions: Action[]) {
    const bg = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x141018, 0.97).setStrokeStyle(2, 0x8a7a3f);
    const title = scene.add.text(-WIDTH / 2 + 16, -HEIGHT / 2 + 14, 'PARTIDA  (O para cerrar)', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e8d9a0',
    });

    const children: Phaser.GameObjects.GameObject[] = [bg, title];

    actions.forEach((action, i) => {
      const y = -HEIGHT / 2 + 56 + i * 32;
      const text = scene.add
        .text(-WIDTH / 2 + 20, y, `> ${action.label}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
        })
        .setInteractive({ useHandCursor: true });
      text.on('pointerdown', action.onClick);
      children.push(text);
    });

    this.statusText = scene.add.text(-WIDTH / 2 + 20, -HEIGHT / 2 + HEIGHT - 92, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b9b1c9',
      wordWrap: { width: WIDTH - 40 },
    });
    children.push(this.statusText);

    this.container = scene.add
      .container(scene.scale.width / 2, scene.scale.height / 2, children)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open = !this.open;
    this.container.setVisible(this.open);
  }

  private layout(): void {
    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
  }
}
