import type { CharacterDefinition } from "./characterTypes";
import { captainFalconCharacter } from "./characters/captainFalcon";
import { marthCharacter } from "./characters/marth";

export const characterDefinitions: Record<string, CharacterDefinition> = {
  [captainFalconCharacter.id]: captainFalconCharacter,
  [marthCharacter.id]: marthCharacter,
};

export function getCharacter(characterId: string): CharacterDefinition {
  const character = characterDefinitions[characterId];

  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  return character;
}
