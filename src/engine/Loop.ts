export class Loop {
  private rafId = 0;
  private last = 0;
  private running = false;

  constructor(private readonly onUpdate: (dt: number) => void) {}

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) {
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.onUpdate(dt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
