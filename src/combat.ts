import { getHurtbox, getMoveHitbox, getShieldBox, rectsOverlap } from "./geometry";
import { getCharacter } from "./characters";
import type { MoveDefinition } from "./moves";
import type { Fighter } from "./types";

export function resolveAttackCollision(attacker: Fighter, defender: Fighter): void {
  const move = getCurrentMove(attacker);

  if (!move || !isMoveActive(attacker, move) || attacker.hitFighterIdsThisMove.has(defender.id)) {
    return;
  }

  const moveHitbox = getMoveHitbox(attacker, move);
  const blockedByShield = defender.state === "shield"
    && defender.shield > 0
    && rectsOverlap(moveHitbox, getShieldBox(defender));

  if (!blockedByShield && !rectsOverlap(moveHitbox, getHurtbox(defender))) {
    return;
  }

  if (blockedByShield) {
    defender.shield = clamp(defender.shield - move.shieldDamage, 0, defender.maxShield);
    defender.velocityX = attacker.facing * getLaunchSpeed(move, defender.damagePercent) * 0.35;
  } else {
    defender.damagePercent += move.damage;
    const knockback = getScaledKnockback(move, defender.damagePercent);
    defender.velocityX = attacker.facing * knockback.x;
    defender.velocityY = knockback.y;
    defender.grounded = false;
    defender.state = "hitstun";
    defender.currentMoveId = null;
    defender.moveFrame = 0;
    defender.hitstunFrames = getHitstunFrames(knockback);
  }

  defender.hitstopFrames = move.hitstopFrames;
  attacker.hitstopFrames = move.hitstopFrames;
  attacker.hitFighterIdsThisMove.add(defender.id);
}

export function getCurrentMove(fighter: Fighter): MoveDefinition | null {
  if (!fighter.currentMoveId) {
    return null;
  }

  return getCharacter(fighter.characterId).moves[fighter.currentMoveId] ?? null;
}

export function getMoveTotalFrames(move: MoveDefinition): number {
  return move.startupFrames + move.activeFrames + move.recoveryFrames;
}

export function getScaledKnockback(
  move: MoveDefinition,
  damagePercent: number,
): { x: number; y: number } {
  const launchSpeed = getLaunchSpeed(move, damagePercent);
  const angleRad = move.knockback.angleDeg * Math.PI / 180;

  return {
    x: Math.cos(angleRad) * launchSpeed,
    y: -Math.sin(angleRad) * launchSpeed,
  };
}

export function getLaunchSpeed(move: MoveDefinition, damagePercent: number): number {
  return move.knockback.base
    + damagePercent * move.knockback.growth
    + move.damage * move.knockback.damageFactor;
}

export function getHitstunFrames(knockback: { x: number; y: number }): number {
  const knockbackMagnitude = Math.hypot(knockback.x, knockback.y);
  return Math.round(10 + knockbackMagnitude / 42);
}

export function isMoveActive(fighter: Fighter, move: MoveDefinition): boolean {
  return fighter.moveFrame >= move.startupFrames
    && fighter.moveFrame < move.startupFrames + move.activeFrames;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
