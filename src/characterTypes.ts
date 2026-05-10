import type { movementConfig, shieldConfig } from "./config";
import type { MoveDefinition } from "./moves";

export type CharacterDefinition = {
  id: string;
  name: string;
  size: { width: number; height: number };
  maxHealth: number;
  maxShield: number;
  movement: typeof movementConfig;
  shield: typeof shieldConfig;
  moves: Record<string, MoveDefinition>;
  cooldowns: Record<string, number>;
};
