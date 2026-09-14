import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { HeroSelectScene } from '../scenes/HeroSelectScene';
import { WorldScene } from '../scenes/WorldScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0f0e13',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, HeroSelectScene, WorldScene],
};
