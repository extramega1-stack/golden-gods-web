import * as THREE from 'three';
import { ONE_SHOT_STATES, type AnimState } from '../assets/manifest';

/**
 * Máquina de estados de animación con transiciones suaves. Los estados de locomoción
 * (idle/walk/run) se interrumpen con los de golpe (attack/cast/hit) y se retoman al
 * terminar; la muerte manda y no se revierte salvo con reset().
 */
export class AnimationController {
  private readonly actions = new Map<AnimState, THREE.AnimationAction>();
  private current: AnimState | null = null;
  private locomotion: AnimState = 'idle';
  private oneShot: AnimState | null = null;

  constructor(
    private readonly mixer: THREE.AnimationMixer,
    clips: Partial<Record<AnimState, THREE.AnimationClip>>
  ) {
    for (const [state, clip] of Object.entries(clips)) {
      if (!clip) {
        continue;
      }
      const action = mixer.clipAction(clip);
      if (ONE_SHOT_STATES.includes(state as AnimState) || state === 'die') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(state as AnimState, action);
    }
    this.mixer.addEventListener('finished', this.onFinished);
  }

  get state(): AnimState | null {
    return this.current;
  }

  setLocomotion(state: 'idle' | 'walk' | 'run'): void {
    this.locomotion = state;
    if (this.oneShot === null) {
      this.transition(state, 0.25);
    }
  }

  trigger(state: 'attack' | 'cast' | 'hit'): void {
    if (this.oneShot === 'die' || !this.actions.has(state)) {
      return;
    }
    this.oneShot = state;
    this.transition(state, 0.08);
  }

  die(): void {
    this.oneShot = 'die';
    this.transition('die', 0.12);
  }

  /** Vuelve a idle y desbloquea la locomoción (al reaparecer). */
  reset(): void {
    this.oneShot = null;
    this.current = null;
    this.locomotion = 'idle';
    for (const action of this.actions.values()) {
      action.stop();
    }
    this.transition('idle', 0);
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
  }

  private readonly onFinished = (event: { action: THREE.AnimationAction }): void => {
    if (this.oneShot === null || this.oneShot === 'die') {
      return;
    }
    const finished = this.actions.get(this.oneShot);
    if (finished !== event.action) {
      return;
    }
    this.oneShot = null;
    this.transition(this.locomotion, 0.2);
  };

  private transition(state: AnimState, fade: number): void {
    if (this.current === state) {
      return;
    }
    const next = this.actions.get(state);
    if (!next) {
      return;
    }

    const previous = this.current ? this.actions.get(this.current) : null;
    next.reset().setEffectiveWeight(1);
    if (fade > 0) {
      next.fadeIn(fade);
    }
    next.play();
    if (previous && previous !== next) {
      if (fade > 0) {
        previous.fadeOut(fade);
      } else {
        previous.stop();
      }
    }
    this.current = state;
  }
}
