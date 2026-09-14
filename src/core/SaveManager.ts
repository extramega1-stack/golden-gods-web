import { SAVE_KEY, SAVE_VERSION } from '../config/constants';
import type { Player } from '../entities/Player';
import type { InventoryItem, ItemSlot } from '../types';

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
  x: number;
  y: number;
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
  static capture(player: Player, godId: string): SaveData {
    return {
      version: SAVE_VERSION,
      godId,
      level: player.level,
      exp: player.exp,
      gold: player.gold,
      talentPoints: player.talentPoints,
      talentRanks: { ...player.talentRanks },
      inventory: player.inventory.map((i) => ({ ...i })),
      equipped: {
        weapon: player.equipped.weapon ? { ...player.equipped.weapon } : null,
        armor: player.equipped.armor ? { ...player.equipped.armor } : null,
      },
      x: player.worldX,
      y: player.worldY,
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
