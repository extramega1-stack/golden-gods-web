import { SAVE_KEY, SAVE_VERSION } from '../config/constants';
import type { InventoryItem, ItemSlot, SaveableHero } from '../types';
import type { QuestState } from '../systems/QuestSystem';

/** Solo lo que hay que recordar de las misiones; nivel y oro ya van en el guardado. */
export interface SavedQuests {
  completed: string[];
  progress: Record<string, number>;
}

export interface SaveData {
  version: number;
  godId: string;
  level: number;
  exp: number;
  gold: number;
  talentPoints: number;
  talentRanks: Record<string, number>;
  inventory: InventoryItem[];
  equipped: Record<ItemSlot, InventoryItem | null>;
  quests: SavedQuests;
  x: number;
  z: number;
  savedAt: number;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function checksum(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export class SaveManager {
  static capture(hero: SaveableHero, godId: string, quests: QuestState): SaveData {
    return {
      version: SAVE_VERSION,
      godId,
      level: hero.level,
      exp: hero.exp,
      gold: hero.gold,
      talentPoints: hero.talentPoints,
      talentRanks: { ...hero.talentRanks },
      inventory: hero.inventory.map((i) => ({ ...i })),
      equipped: {
        weapon: hero.equipped.weapon ? { ...hero.equipped.weapon } : null,
        armor: hero.equipped.armor ? { ...hero.equipped.armor } : null,
      },
      quests: {
        completed: [...quests.completed],
        progress: { ...quests.progress },
      },
      x: hero.worldX,
      z: hero.worldZ,
      savedAt: Date.now(),
    };
  }

  static persist(save: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // almacenamiento no disponible: se ignora
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return null;
      }
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== SAVE_VERSION) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignorar
    }
  }

  static exportCode(save: SaveData): string {
    const encoded = toBase64(JSON.stringify(save));
    return `${encoded}.${checksum(encoded)}`;
  }

  static importCode(code: string): SaveData | null {
    const trimmed = code.trim();
    const dot = trimmed.lastIndexOf('.');
    if (dot <= 0) {
      return null;
    }
    const encoded = trimmed.slice(0, dot);
    const sum = trimmed.slice(dot + 1);
    if (checksum(encoded) !== sum) {
      return null;
    }
    try {
      const data = JSON.parse(fromBase64(encoded)) as SaveData;
      if (data.version !== SAVE_VERSION) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }
}
