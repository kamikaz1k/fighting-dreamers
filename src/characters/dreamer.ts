import { movementConfig, shieldConfig } from "../config";
import { moveDefinitions } from "../moves";
import type { CharacterDefinition } from "../characterTypes";

export const dreamerMoves = moveDefinitions;

export const dreamerCharacter: CharacterDefinition = {
  id: "dreamer",
  name: "Dreamer",
  size: { width: 52, height: 83 },
  maxShield: 100,
  movement: movementConfig,
  shield: shieldConfig,
  moves: dreamerMoves,
  cooldowns: {
    sideSpecial: 18,
    backSpecial: 18,
    upSpecial: 20,
    airSideSpecial: 18,
    airBackSpecial: 18,
    airUpSpecial: 20,
    airDownSpecial: 22,
  },
};
