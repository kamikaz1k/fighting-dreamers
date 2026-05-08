import { shieldConfig } from "./config";
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
  return {
    x: fighter.x - fighter.width / 2,
    y: fighter.y - fighter.height,
    width: fighter.width,
    height: fighter.height,
  };
}

export function getShieldBox(fighter: Fighter): Rect {
  return {
    x: fighter.x + shieldConfig.box.offsetX - shieldConfig.box.width / 2,
    y: fighter.y + shieldConfig.box.offsetY - shieldConfig.box.height / 2,
    width: shieldConfig.box.width,
    height: shieldConfig.box.height,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
