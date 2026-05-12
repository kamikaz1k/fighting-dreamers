import { movementConfig, shieldConfig } from "../config";
import { moveDefinitions } from "../moves";
import type { CharacterDefinition } from "../characterTypes";

export const dreamerMoves = moveDefinitions;

export const dreamerCharacter: CharacterDefinition = {
  id: "dreamer",
  name: "Dreamer",
  size: { width: 52, height: 83 },
  maxHealth: 100,
  maxShield: 100,
  movement: movementConfig,
  shield: shieldConfig,
  moves: dreamerMoves,
  cooldowns: {
    groundForwardStrong: 18,
    groundBackStrong: 18,
    groundUpStrong: 20,
    airForwardStrong: 18,
    airBackStrong: 18,
    airUpStrong: 20,
    airDownStrong: 22,
  },
};
