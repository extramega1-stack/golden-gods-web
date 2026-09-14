import type { Joystick } from '../ui/Joystick';

/** Teclado WASD/flechas y joystick táctil, normalizados a un vector de pantalla. */
export class InputManager {
  private readonly keys = new Set<string>();

  constructor(private readonly joystick: Joystick | null) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Vector en espacio de pantalla, con arriba = -1, normalizado si no es cero. */
  getMoveVector(): { x: number; y: number } {
    const joy = this.joystick?.getVector();
    if (joy && (joy.x !== 0 || joy.y !== 0)) {
      return joy;
    }

    let x = 0;
    let y = 0;
    if (this.has('w', 'arrowup')) y -= 1;
    if (this.has('s', 'arrowdown')) y += 1;
    if (this.has('a', 'arrowleft')) x -= 1;
    if (this.has('d', 'arrowright')) x += 1;

    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  private has(...names: string[]): boolean {
    return names.some((name) => this.keys.has(name));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key.toLowerCase());
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
  };
}
