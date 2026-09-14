export type QuestObjective =
  | { kind: 'kill'; enemyId: string; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'gold'; amount: number };

export interface QuestReward {
  gold?: number;
  exp?: number;
  itemId?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  objective: QuestObjective;
  reward: QuestReward;
}

/**
 * Cadena de misiones en orden. La activa es siempre la primera sin completar, así que
 * siempre hay un objetivo claro y no hace falta árbol de dependencias.
 */
export const QUESTS: QuestDef[] = [
  {
    id: 'primeros-pasos',
    name: 'Primeros pasos',
    description: 'Los fangos del prado se han vuelto agresivos. Despeja unos cuantos.',
    objective: { kind: 'kill', enemyId: 'slime', count: 3 },
    reward: { gold: 30, exp: 20 },
  },
  {
    id: 'prado-limpio',
    name: 'El prado respira',
    description: 'Sigue limpiando fangos hasta que el camino quede despejado.',
    objective: { kind: 'kill', enemyId: 'slime', count: 8 },
    reward: { gold: 60, exp: 40, itemId: 'cloth_armor' },
  },
  {
    id: 'aprendiz',
    name: 'Aprendiz de dios',
    description: 'Un dios sin nivel no es nada. Alcanza el nivel 3 y reparte tus talentos.',
    objective: { kind: 'level', level: 3 },
    reward: { exp: 50 },
  },
  {
    id: 'brutos-de-khar',
    name: 'Los brutos de Khar',
    description: 'En las ruinas hay brutos que parten escudos. Encárgate de ellos.',
    objective: { kind: 'kill', enemyId: 'brute', count: 4 },
    reward: { gold: 120, exp: 80, itemId: 'rusty_sword' },
  },
  {
    id: 'acaudalado',
    name: 'Con la bolsa llena',
    description: 'La herrería no regala nada. Reúne oro para mejorar tu equipo.',
    objective: { kind: 'gold', amount: 150 },
    reward: { exp: 60, itemId: 'leather_armor' },
  },
  {
    id: 'titan-caido',
    name: 'El Titán Caído',
    description: 'En la cima duerme el Titán. Baja a la arena y acaba con él.',
    objective: { kind: 'kill', enemyId: 'titan', count: 1 },
    reward: { gold: 300, exp: 200, itemId: 'titan_cleaver' },
  },
];

/** Texto corto del objetivo, para el HUD. */
export function questObjectiveText(quest: QuestDef, progress: number): string {
  switch (quest.objective.kind) {
    case 'kill':
      return `Mata ${quest.objective.count} ${enemyLabel(quest.objective.enemyId)} (${Math.min(progress, quest.objective.count)}/${quest.objective.count})`;
    case 'level':
      return `Alcanza el nivel ${quest.objective.level} (${Math.min(progress, quest.objective.level)}/${quest.objective.level})`;
    case 'gold':
      return `Reúne ${quest.objective.amount} de oro (${Math.min(progress, quest.objective.amount)}/${quest.objective.amount})`;
  }
}

function enemyLabel(enemyId: string): string {
  const labels: Record<string, string> = {
    slime: 'fangos',
    brute: 'brutos',
    titan: 'al Titán',
  };
  return labels[enemyId] ?? enemyId;
}
