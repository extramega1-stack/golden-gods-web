import type Phaser from 'phaser';
import { Actor } from './Actor';
import { botTextureKey, type BotDef } from '../data/bots';

export class PartyBot extends Actor {
  readonly botName: string;
  readonly engageRange: number;

  constructor(scene: Phaser.Scene, wx: number, wy: number, def: BotDef) {
    super(scene, wx, wy, botTextureKey(def.id), { ...def.stats });
    this.botName = def.name;
    this.engageRange = def.engageRange;
    this.radius = 0.32;
  }
}
