import Phaser from 'phaser';
import type { Vec2 } from '../types';

const DEPTH = 100000;
const DEAD_ZONE = 0.15;

export class Joystick {
  private pointerId: number | null = null;
  private dx = 0;
  private dy = 0;
  private cx = 0;
  private cy = 0;
  private readonly radius = 64;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;

  constructor(private readonly scene: Phaser.Scene) {
    this.base = scene.add
      .circle(0, 0, this.radius, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.thumb = scene.add
      .circle(0, 0, this.radius * 0.45, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
  }

  private layout(): void {
    this.cx = 110;
    this.cy = this.scene.scale.height - 110;
    this.base.setPosition(this.cx, this.cy);
    this.resetThumb();
  }

  private resetThumb(): void {
    this.thumb.setPosition(this.cx, this.cy);
    this.dx = 0;
    this.dy = 0;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) {
      return;
    }
    if (pointer.x >= this.scene.scale.width * 0.55) {
      return;
    }
    this.pointerId = pointer.id;
    this.updateFromPointer(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }
    this.updateFromPointer(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    this.resetThumb();
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    let vx = pointer.x - this.cx;
    let vy = pointer.y - this.cy;
    const len = Math.hypot(vx, vy);
    if (len > this.radius) {
      vx = (vx / len) * this.radius;
      vy = (vy / len) * this.radius;
    }
    this.thumb.setPosition(this.cx + vx, this.cy + vy);
    this.dx = vx / this.radius;
    this.dy = vy / this.radius;
  }

  getVector(): Vec2 {
    const len = Math.hypot(this.dx, this.dy);
    if (len < DEAD_ZONE) {
      return { x: 0, y: 0 };
    }
    return { x: this.dx, y: this.dy };
  }
}
