import type { PlayerUnit } from '../entities/PlayerUnit';
import type { SkillDef } from '../types';

interface Slot {
  skill: SkillDef;
  button: HTMLButtonElement;
  cooldown: HTMLDivElement;
}

/** Barra de habilidades: teclas y toque, con coste y cooldown visibles. */
export class SkillBar {
  private readonly slots: Slot[] = [];

  constructor(host: HTMLElement, skills: SkillDef[], onCast: (id: string) => void) {
    const bar = document.createElement('div');
    bar.id = 'skillbar';

    for (const skill of skills) {
      const button = document.createElement('button');
      button.className = 'skill';
      button.type = 'button';

      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = skill.key;

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = skill.name;

      const cost = document.createElement('span');
      cost.className = 'cost';
      cost.textContent = String(skill.cost);

      const cooldown = document.createElement('div');
      cooldown.className = 'cooldown';

      button.append(cooldown, key, label, cost);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        onCast(skill.id);
      });

      bar.appendChild(button);
      this.slots.push({ skill, button, cooldown });
    }

    host.appendChild(bar);
  }

  update(player: PlayerUnit, now: number): void {
    for (const slot of this.slots) {
      const readyAt = player.skillReadyAt[slot.skill.id] ?? 0;
      const remaining = Math.max(0, readyAt - now);
      const ratio = remaining / (slot.skill.cooldown * 1000);

      slot.cooldown.style.height = `${ratio * 100}%`;
      slot.cooldown.style.display = ratio > 0 ? 'block' : 'none';

      const affordable = player.stats.mp >= slot.skill.cost;
      slot.button.classList.toggle('poor', !affordable);
    }
  }
}
