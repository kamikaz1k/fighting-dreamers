import type { CharacterDefinition } from "./characterTypes";
import { dreamerCharacter } from "./characters/dreamer";
import { strikerCharacter } from "./characters/striker";

export const characterDefinitions: Record<string, CharacterDefinition> = {
  [dreamerCharacter.id]: dreamerCharacter,
  [strikerCharacter.id]: strikerCharacter,
};

export function getCharacter(characterId: string): CharacterDefinition {
  const character = characterDefinitions[characterId];

  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  return character;
}
