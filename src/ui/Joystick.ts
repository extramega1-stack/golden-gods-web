const RADIUS = 60;
const DEAD_ZONE = 0.18;

/** Joystick táctil flotante: aparece donde tocas la mitad inferior izquierda. */
export class Joystick {
  private readonly el: HTMLDivElement;
  private readonly thumb: HTMLDivElement;
  private readonly enabled: boolean;
  private pointerId: number | null = null;
  private cx = 0;
  private cy = 0;
  private vx = 0;
  private vy = 0;

  constructor(host: HTMLElement) {
    this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.el = document.createElement('div');
    this.el.id = 'joystick';
    this.thumb = document.createElement('div');
    this.thumb.id = 'joystick-thumb';
    this.el.appendChild(this.thumb);
    host.appendChild(this.el);

    if (this.enabled) {
      window.addEventListener('pointerdown', this.onDown);
      window.addEventListener('pointermove', this.onMove);
      window.addEventListener('pointerup', this.onUp);
      window.addEventListener('pointercancel', this.onUp);
    }
  }

  /** Vector en espacio de pantalla, con arriba = -1 (mismo criterio que el teclado). */
  getVector(): { x: number; y: number } {
    return { x: this.vx, y: this.vy };
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (this.pointerId !== null) {
      return;
    }
    if (event.clientX > window.innerWidth * 0.55 || event.clientY < window.innerHeight * 0.35) {
      return;
    }
    this.pointerId = event.pointerId;
    this.cx = event.clientX;
    this.cy = event.clientY;
    this.el.style.display = 'block';
    this.el.style.left = `${this.cx - RADIUS}px`;
    this.el.style.top = `${this.cy - RADIUS}px`;
    this.update(event.clientX, event.clientY);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.update(event.clientX, event.clientY);
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    this.vx = 0;
    this.vy = 0;
    this.el.style.display = 'none';
    this.thumb.style.transform = 'translate(-50%, -50%)';
  };

  private update(px: number, py: number): void {
    let dx = px - this.cx;
    let dy = py - this.cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const magnitude = Math.hypot(dx, dy) / RADIUS;
    if (magnitude < DEAD_ZONE) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    this.vx = dx / RADIUS;
    this.vy = dy / RADIUS;
  }
}
