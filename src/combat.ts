import { getHurtbox, getMoveHitboxes, getShieldBox, rectsOverlap } from "./geometry";
import { getCharacter } from "./characters";
import type { MoveDefinition, MoveHitboxDefinition } from "./moves";
import type { Fighter } from "./types";

export function resolveAttackCollision(attacker: Fighter, defender: Fighter): void {
  const move = getCurrentMove(attacker);

  if (!move || !isMoveActive(attacker, move) || attacker.hitFighterIdsThisMove.has(defender.id)) {
    return;
  }

  const shieldHitbox = defender.state === "shield" && defender.shield > 0
    ? findCollidingMoveHitbox(attacker, move, getShieldBox(defender))
    : null;
  const hurtboxHitbox = shieldHitbox
    ? null
    : findCollidingMoveHitbox(attacker, move, getHurtbox(defender));
  const matchedHitbox = shieldHitbox ?? hurtboxHitbox;

  if (!matchedHitbox) {
    return;
  }

  const hit = getResolvedHit(move, matchedHitbox);

  if (shieldHitbox) {
    defender.shield = clamp(defender.shield - hit.shieldDamage, 0, defender.maxShield);
    defender.velocityX = attacker.facing * getLaunchSpeed(hit, defender.damagePercent) * 0.35;
  } else {
    defender.damagePercent += hit.damage;
    const knockback = getScaledKnockback(hit, defender.damagePercent);
    defender.velocityX = attacker.facing * knockback.x;
    defender.velocityY = knockback.y;
    defender.grounded = false;
    defender.state = "hitstun";
    defender.currentMoveId = null;
    defender.moveFrame = 0;
    defender.hitstunFrames = getHitstunFrames(knockback);
  }

  defender.hitstopFrames = hit.hitstopFrames;
  attacker.hitstopFrames = hit.hitstopFrames;
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

export function getResolvedHit(
  move: MoveDefinition,
  hitbox: MoveHitboxDefinition,
): MoveDefinition {
  return {
    ...move,
    damage: hitbox.damage ?? move.damage,
    knockback: hitbox.knockback ?? move.knockback,
    shieldDamage: hitbox.shieldDamage ?? move.shieldDamage,
    hitstopFrames: hitbox.hitstopFrames ?? move.hitstopFrames,
  };
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

function findCollidingMoveHitbox(
  fighter: Fighter,
  move: MoveDefinition,
  target: { x: number; y: number; width: number; height: number },
): MoveHitboxDefinition | null {
  for (const hitbox of getMoveHitboxes(fighter, move)) {
    if (rectsOverlap(hitbox.rect, target)) {
      return hitbox.definition;
    }
  }

  return null;
}
