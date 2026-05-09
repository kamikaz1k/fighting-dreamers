import { getCharacter } from "./characters";
import type { MoveDefinition } from "./moves";
import type { BufferedAction, Fighter, FighterCommand } from "./types";

export function getMoveForBufferedAction(fighter: Fighter, action: BufferedAction): MoveDefinition {
  const character = getCharacter(fighter.characterId);
  const move = Object.values(character.moves).find((definition) => {
    return definition.button === action.button
      && definition.direction === action.direction
      && definition.context === (action.grounded ? "ground" : "air");
  });

  if (!move) {
    const context = action.grounded ? "ground" : "air";
    throw new Error(`Missing ${fighter.characterId} move definition for ${context} ${action.direction} ${action.button}`);
  }

  return move;
}

export function getMoveDirection(fighter: Fighter, command: FighterCommand) {
  if (command.moveY === -1) {
    return "up";
  }

  if (command.moveY === 1) {
    return "down";
  }

  if (command.moveX === fighter.facing) {
    return "forward";
  }

  if (command.moveX === -fighter.facing) {
    return "back";
  }

  return "neutral";
}
