import { getCharacter } from "./characters";
import type { Fighter, Rect } from "./types";
import type { MoveDefinition } from "./moves";

export function getMoveHitbox(fighter: Fighter, move: MoveDefinition): Rect {
  const x = fighter.facing === 1
    ? fighter.x + move.hitbox.x
    : fighter.x - move.hitbox.x - move.hitbox.width;

  return {
    x,
    y: fighter.y + move.hitbox.y,
    width: move.hitbox.width,
    height: move.hitbox.height,
  };
}

export function getHurtbox(fighter: Fighter): Rect {
  const height = fighter.state === "crouch"
    ? fighter.height * getCharacter(fighter.characterId).movement.crouchHeightMultiplier
    : fighter.height;

  return {
    x: fighter.x - fighter.width / 2,
    y: fighter.y - height,
    width: fighter.width,
    height,
  };
}

export function getShieldBox(fighter: Fighter): Rect {
  const shieldBox = getCharacter(fighter.characterId).shield.box;

  return {
    x: fighter.x + shieldBox.offsetX - shieldBox.width / 2,
    y: fighter.y + shieldBox.offsetY - shieldBox.height / 2,
    width: shieldBox.width,
    height: shieldBox.height,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
