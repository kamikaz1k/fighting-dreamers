import { getHurtbox, getMoveHitboxes, getShieldBox, rectsOverlap } from "./geometry";
import { getCharacter } from "./characters";
import type { MoveDefinition, MoveHitboxDefinition, MoveHitWindowDefinition } from "./moves";
import type { Fighter } from "./types";

export function resolveAttackCollision(attacker: Fighter, defender: Fighter): void {
  const move = getCurrentMove(attacker);

  const hitWindow = move ? getActiveHitWindow(attacker, move) : null;

  if (!move || !hitWindow || attacker.hitFighterIdsThisMove.has(getHitTrackingKey(hitWindow, defender))) {
    return;
  }

  const shieldHitbox = defender.state === "shield" && defender.shield > 0
    ? findCollidingMoveHitbox(attacker, move, hitWindow, getShieldBox(defender))
    : null;
  const hurtboxHitbox = shieldHitbox
    ? null
    : findCollidingMoveHitbox(attacker, move, hitWindow, getHurtbox(defender));
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
    defender.velocityX = attacker.facing * (matchedHitbox.launchFacing ?? 1) * knockback.x;
    defender.velocityY = knockback.y;
    defender.grounded = false;
    defender.state = "hitstun";
    defender.currentMoveId = null;
    defender.moveFrame = 0;
    defender.hitstunFrames = getHitstunFrames(knockback);
  }

  defender.hitstopFrames = hit.hitstopFrames;
  attacker.hitstopFrames = hit.hitstopFrames;
  attacker.hitFighterIdsThisMove.add(getHitTrackingKey(hitWindow, defender));
}

export function getCurrentMove(fighter: Fighter): MoveDefinition | null {
  if (!fighter.currentMoveId) {
    return null;
  }

  return getCharacter(fighter.characterId).moves[fighter.currentMoveId] ?? null;
}

export function getMoveTotalFrames(move: MoveDefinition): number {
  return getMoveRecoveryStartFrame(move) + move.recoveryFrames;
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
  return getActiveHitWindow(fighter, move) !== null;
}

export function getActiveHitWindow(
  fighter: Fighter,
  move: MoveDefinition,
): MoveHitWindowDefinition | null {
  for (const hitWindow of getMoveHitWindows(move)) {
    if (fighter.moveFrame >= hitWindow.startFrame && fighter.moveFrame < hitWindow.endFrame) {
      return hitWindow;
    }
  }

  return null;
}

export function getMoveRecoveryStartFrame(move: MoveDefinition): number {
  return Math.max(...getMoveHitWindows(move).map((hitWindow) => hitWindow.endFrame));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findCollidingMoveHitbox(
  fighter: Fighter,
  move: MoveDefinition,
  hitWindow: MoveHitWindowDefinition,
  target: { x: number; y: number; width: number; height: number },
): MoveHitboxDefinition | null {
  for (const hitbox of getMoveHitboxes(fighter, move, hitWindow)) {
    if (rectsOverlap(hitbox.rect, target)) {
      return hitbox.definition;
    }
  }

  return null;
}

function getMoveHitWindows(move: MoveDefinition): MoveHitWindowDefinition[] {
  return move.hitWindows ?? [{
    id: "default",
    startFrame: move.startupFrames,
    endFrame: move.startupFrames + move.activeFrames,
  }];
}

function getHitTrackingKey(hitWindow: MoveHitWindowDefinition, defender: Fighter): string {
  return `${hitWindow.hitGroupId ?? hitWindow.id}:${defender.id}`;
}
