export type AnimState = 'idle' | 'walk' | 'run' | 'attack' | 'cast' | 'hit' | 'die';

/** Estados que se reproducen una vez y vuelven a la locomoción. */
export const ONE_SHOT_STATES: AnimState[] = ['attack', 'cast', 'hit'];

/**
 * Candidatos por estado; se usa el primero que exista en el modelo. Los nombres vienen
 * de los packs de KayKit, así que cambiar de pack es ampliar estas listas.
 */
export const ANIMATION_CANDIDATES: Record<AnimState, string[]> = {
  idle: ['Idle', 'Unarmed_Idle', '2H_Melee_Idle'],
  walk: ['Walking_A', 'Walking_B'],
  run: ['Running_A', 'Running_B'],
  attack: [
    '1H_Melee_Attack_Chop',
    '2H_Melee_Attack_Slice',
    'Unarmed_Melee_Attack_Punch_A',
    '1H_Melee_Attack_Slice_Horizontal',
  ],
  cast: ['Spellcast_Shoot', 'Spellcasting', 'Spellcast_Raise', 'Spellcast_Long'],
  hit: ['Hit_A', 'Hit_B'],
  die: ['Death_A', 'Death_B'],
};

export function pickAnimation(available: string[], state: AnimState): string | null {
  return ANIMATION_CANDIDATES[state].find((name) => available.includes(name)) ?? null;
}

/** Empareja los clips que trae un modelo con los estados del juego. */
export function resolveAnimations(available: string[]): Partial<Record<AnimState, string>> {
  const resolved: Partial<Record<AnimState, string>> = {};
  for (const state of Object.keys(ANIMATION_CANDIDATES) as AnimState[]) {
    const name = pickAnimation(available, state);
    if (name) {
      resolved[state] = name;
    }
  }
  return resolved;
}

/** Alturas a las que se normaliza cada modelo, en unidades de mundo. */
export const MODEL_HEIGHTS = {
  god: 3.4,
  bot: 3.2,
  minion: 2.6,
  brute: 3.6,
  boss: 6,
} as const;

export const GOD_MODELS: Record<string, string> = {
  aureon: 'knight',
  kael: 'barbarian',
  nel: 'rogue',
  sira: 'mage',
};

export const ENEMY_MODELS: Record<string, string> = {
  slime: 'skeleton-minion',
  brute: 'skeleton-warrior',
  titan: 'skeleton-mage',
};

export const BOT_MODELS: Record<string, string> = {
  aelia: 'mage',
  brann: 'knight',
};

export const POPULATION_MODELS = ['barbarian', 'rogue', 'knight', 'mage'];

/** Semilla del reparto de decoración: fija para que el mundo sea siempre el mismo. */
export const PROPS_SEED = 20260914;

export interface WeaponSpec {
  /** Nodo de enganche dentro del personaje (se sanea como hace three al cargar glTF). */
  slot: string;
  /** Id del arma en public/models/weapons/. */
  weapon: string;
  scale?: number;
}

/**
 * Qué lleva cada personaje en la mano. Los nodos de enganche son los que traen los
 * propios modelos de KayKit (`1H_Sword`, `2H_Axe`, `Round_Shield`...). Los esqueletos
 * solo tienen `handslot.l/r`, así que se les cuelga del derecho.
 */
export const MODEL_WEAPONS: Record<string, WeaponSpec[]> = {
  knight: [
    { slot: '1H_Sword', weapon: 'sword-1h' },
    { slot: 'Round_Shield', weapon: 'shield-round' },
  ],
  barbarian: [{ slot: '2H_Axe', weapon: 'axe-2h' }],
  rogue: [{ slot: '2H_Crossbow', weapon: 'crossbow-2h' }],
  mage: [{ slot: '2H_Staff', weapon: 'staff' }],
  'skeleton-minion': [{ slot: 'handslot.r', weapon: 'dagger' }],
  'skeleton-warrior': [{ slot: 'handslot.r', weapon: 'axe-2h' }],
  'skeleton-mage': [{ slot: 'handslot.r', weapon: 'staff' }],
};

export const ALL_WEAPON_IDS = [
  ...new Set(Object.values(MODEL_WEAPONS).flatMap((specs) => specs.map((spec) => spec.weapon))),
];

/** Todos los modelos que hay que precargar. */
export const ALL_MODEL_IDS = [
  ...new Set([
    ...Object.values(GOD_MODELS),
    ...Object.values(ENEMY_MODELS),
    ...Object.values(BOT_MODELS),
    ...POPULATION_MODELS,
  ]),
];
