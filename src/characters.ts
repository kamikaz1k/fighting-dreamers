import { movementConfig, shieldConfig } from "./config";
import { moveDefinitions, type MoveDefinition } from "./moves";

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

export const characterDefinitions: Record<string, CharacterDefinition> = {
  dreamer: {
    id: "dreamer",
    name: "Dreamer",
    size: { width: 52, height: 104 },
    maxHealth: 100,
    maxShield: 100,
    movement: movementConfig,
    shield: shieldConfig,
    moves: moveDefinitions,
    cooldowns: {},
  },
};

export function getCharacter(characterId: string): CharacterDefinition {
  const character = characterDefinitions[characterId];

  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  return character;
}
