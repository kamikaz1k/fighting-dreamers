import { moveDefinitions, type MoveDefinition } from "./moves";
import type { BufferedAction, Fighter, FighterCommand } from "./types";

export function getMoveForBufferedAction(action: BufferedAction): MoveDefinition {
  const move = Object.values(moveDefinitions).find((definition) => {
    return definition.button === action.button
      && definition.direction === action.direction
      && definition.context === (action.grounded ? "ground" : "air");
  });

  if (!move) {
    const context = action.grounded ? "ground" : "air";
    throw new Error(`Missing move definition for ${context} ${action.direction} ${action.button}`);
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
