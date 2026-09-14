import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

new Phaser.Game(gameConfig);

const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;

if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
