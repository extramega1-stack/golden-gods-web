import { QUESTS, questObjectiveText } from '../data/quests';
import { activeQuest, questProgress, type QuestState } from '../systems/QuestSystem';

/** Registro de misiones en DOM: se abre con L. */
export class QuestPanel {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private open = false;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'quests';
    this.root.className = 'panel';
    this.root.hidden = true;

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('span');
    title.textContent = 'MISIONES';
    header.appendChild(title);

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.textContent = 'L para cerrar';

    this.body = document.createElement('div');
    this.body.className = 'panel-body';

    this.root.append(header, hint, this.body);
    host.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(state: QuestState): void {
    this.open = !this.open;
    this.root.hidden = !this.open;
    if (this.open) {
      this.refresh(state);
    }
  }

  refresh(state: QuestState): void {
    this.body.textContent = '';
    const active = activeQuest(state);

    for (const quest of QUESTS) {
      const done = state.completed.includes(quest.id);
      const isActive = active?.id === quest.id;

      const row = document.createElement('div');
      row.className = `quest-row${done ? ' done' : ''}${isActive ? ' active' : ''}`;

      const name = document.createElement('strong');
      name.textContent = `${done ? '✔' : isActive ? '▶' : '·'} ${quest.name}`;

      const description = document.createElement('span');
      description.className = 'quest-desc';
      description.textContent = quest.description;

      const objective = document.createElement('span');
      objective.className = 'quest-objective';
      objective.textContent = done
        ? 'Completada'
        : questObjectiveText(quest, isActive ? questProgress(state, quest) : 0);

      const reward = document.createElement('span');
      reward.className = 'quest-reward';
      reward.textContent = QuestPanel.describeReward(quest);

      row.append(name, description, objective, reward);
      this.body.appendChild(row);
    }
  }

  private static describeReward(quest: (typeof QUESTS)[number]): string {
    const parts: string[] = [];
    if (quest.reward.gold) {
      parts.push(`${quest.reward.gold} oro`);
    }
    if (quest.reward.exp) {
      parts.push(`${quest.reward.exp} EXP`);
    }
    if (quest.reward.itemId) {
      parts.push(quest.reward.itemId);
    }
    return parts.length > 0 ? `Recompensa: ${parts.join(' · ')}` : '';
  }
}
