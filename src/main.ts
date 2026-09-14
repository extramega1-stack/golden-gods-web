import './ui/styles.css';
import { App } from './app/App';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Falta el contenedor #app en index.html');
}

new App(container);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;
  if (!isNativeApp) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}
