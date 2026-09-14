import { QUESTS, type QuestDef } from '../data/quests';

export interface QuestState {
  completed: string[];
  progress: Record<string, number>;
  level: number;
  gold: number;
}

export interface QuestEvent {
  level: number;
  gold: number;
  killedEnemy?: string;
}

export function createQuestState(): QuestState {
  return { completed: [], progress: {}, level: 1, gold: 0 };
}

/** La misión activa es la primera sin completar: una cadena, sin dependencias. */
export function activeQuest(state: QuestState): QuestDef | null {
  return QUESTS.find((quest) => !state.completed.includes(quest.id)) ?? null;
}

function objectiveTarget(quest: QuestDef): number {
  switch (quest.objective.kind) {
    case 'kill':
      return quest.objective.count;
    case 'level':
      return quest.objective.level;
    case 'gold':
      return quest.objective.amount;
  }
}

/** Cuánto lleva avanzado el objetivo (para el texto del HUD). */
export function questProgress(state: QuestState, quest: QuestDef): number {
  switch (quest.objective.kind) {
    case 'kill':
      return state.progress[quest.id] ?? 0;
    case 'level':
      return state.level;
    case 'gold':
      return state.gold;
  }
}

export function questIsDone(state: QuestState, quest: QuestDef): boolean {
  return questProgress(state, quest) >= objectiveTarget(quest);
}

/**
 * Aplica un suceso del mundo y devuelve las misiones completadas con él.
 *
 * Se comprueba en bucle porque completar una puede dejar satisfecha la siguiente (subir
 * de nivel de golpe cierra varias misiones de nivel). Las bajas solo cuentan para la
 * misión activa, así que no se puede farmear por adelantado.
 */
export function advance(state: QuestState, event: QuestEvent): QuestDef[] {
  state.level = event.level;
  state.gold = event.gold;

  const current = activeQuest(state);
  if (current && event.killedEnemy && current.objective.kind === 'kill') {
    if (current.objective.enemyId === event.killedEnemy) {
      state.progress[current.id] = (state.progress[current.id] ?? 0) + 1;
    }
  }

  const completed: QuestDef[] = [];
  for (let guard = 0; guard < QUESTS.length; guard++) {
    const quest = activeQuest(state);
    if (!quest || !questIsDone(state, quest)) {
      break;
    }
    state.completed.push(quest.id);
    completed.push(quest);
  }
  return completed;
}
