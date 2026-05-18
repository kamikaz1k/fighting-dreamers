import { getCurrentMove, getMoveTotalFrames } from "./combat";
import { getCharacter } from "./characters";
import {
  FIXED_TIMESTEP_SECONDS,
  inputConfig,
} from "./config";
import { clamp, moveToward } from "./math";
import { getMoveDirection, getMoveForBufferedAction } from "./moveLookup";
import type { MoveDefinition } from "./moves";
import type { BufferedAction, Fighter, FighterCommand } from "./types";

export function updateHitstop(fighter: Fighter): boolean {
  if (fighter.hitstopFrames <= 0) {
    return false;
  }

  fighter.hitstopFrames -= 1;
  return true;
}

export function updateHitstun(fighter: Fighter): void {
  if (fighter.hitstunFrames <= 0) {
    return;
  }

  fighter.hitstunFrames -= 1;

  if (fighter.hitstunFrames === 0) {
    fighter.state = fighter.grounded ? "idle" : "fall";
  }
}

export function updateActions(fighter: Fighter, command: FighterCommand): void {
  updateMoveCooldowns(fighter);
  updateInputBuffer(fighter, command);

  if (fighter.state === "hitstun" || fighter.state === "ledge" || fighter.state === "ko") {
    return;
  }

  if (fighter.state === "attack") {
    updateAttack(fighter);
    return;
  }

  updateShield(fighter, command);

  if (fighter.state === "shield") {
    return;
  }

  const bufferedAction = fighter.bufferedAction;

  if (bufferedAction) {
    const move = getMoveForBufferedAction(fighter, bufferedAction);

    if (getMoveCooldown(fighter, move) > 0 || !canUseMove(fighter, move)) {
      return;
    }

    startAttack(fighter, move, bufferedAction);
    fighter.bufferedAction = null;
  }
}

export function updateMoveCooldowns(fighter: Fighter): void {
  for (const [moveId, framesRemaining] of fighter.moveCooldowns) {
    if (framesRemaining <= 1) {
      fighter.moveCooldowns.delete(moveId);
    } else {
      fighter.moveCooldowns.set(moveId, framesRemaining - 1);
    }
  }
}

export function updateShield(fighter: Fighter, command: FighterCommand): void {
  const character = getCharacter(fighter.characterId);
  const shield = character.shield;
  const movement = character.movement;

  if (command.shieldHeld && fighter.grounded && fighter.shield >= shield.minToActivate) {
    fighter.state = "shield";
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movement.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
    fighter.shield = clamp(
      fighter.shield - shield.holdDrainPerSecond * FIXED_TIMESTEP_SECONDS,
      0,
      fighter.maxShield,
    );
    return;
  }

  if (fighter.state === "shield") {
    fighter.state = fighter.grounded ? "idle" : "fall";
  }

  fighter.shield = clamp(
    fighter.shield + shield.regenPerSecond * FIXED_TIMESTEP_SECONDS,
    0,
    fighter.maxShield,
  );
}

export function updateInputBuffer(fighter: Fighter, command: FighterCommand): void {
  if (command.attackPressed || command.specialPressed) {
    fighter.bufferedAction = {
      button: command.attackPressed ? "attack" : "special",
      direction: getMoveDirection(fighter, command),
      moveX: command.moveX,
      smash: fighter.grounded && command.attackPressed && command.smashPressed,
      grounded: fighter.grounded,
      framesRemaining: inputConfig.bufferFrames,
    };
    return;
  }

  if (!fighter.bufferedAction) {
    return;
  }

  fighter.bufferedAction.framesRemaining -= 1;

  if (fighter.bufferedAction.framesRemaining <= 0) {
    fighter.bufferedAction = null;
  }
}

export function startAttack(
  fighter: Fighter,
  move: MoveDefinition,
  action?: BufferedAction,
): void {
  fighter.state = "attack";
  fighter.dashDirection = null;
  fighter.dashFramesRemaining = 0;
  fighter.currentMoveId = move.id;
  fighter.moveFrame = 0;
  fighter.hitFighterIdsThisMove.clear();

  if (move.selfVelocity) {
    const direction = getSelfVelocityDirection(fighter, move, action);
    fighter.velocityX = direction * move.selfVelocity.x;
    fighter.velocityY = move.selfVelocity.y;
    fighter.grounded = false;
  }

  const cooldownKey = getCooldownKey(move);

  if (cooldownKey === "upSpecial") {
    fighter.upSpecialAvailable = false;
  }

  const cooldownFrames = getCharacter(fighter.characterId).cooldowns[cooldownKey] ?? 0;

  if (cooldownFrames > 0) {
    fighter.moveCooldowns.set(cooldownKey, cooldownFrames);
  }
}

export function updateAttack(fighter: Fighter): void {
  const move = getCurrentMove(fighter);

  if (!move) {
    fighter.state = "idle";
    fighter.currentMoveId = null;
    fighter.moveFrame = 0;
    return;
  }

  fighter.moveFrame += 1;

  if (fighter.moveFrame >= getMoveTotalFrames(move)) {
    fighter.state = fighter.grounded ? "idle" : "fall";
    fighter.currentMoveId = null;
    fighter.moveFrame = 0;
    fighter.hitFighterIdsThisMove.clear();
  }
}

export function getMoveCooldown(fighter: Fighter, move: MoveDefinition): number {
  return fighter.moveCooldowns.get(getCooldownKey(move)) ?? 0;
}

function getCooldownKey(move: MoveDefinition): string {
  return move.cooldownKey ?? move.id;
}

function canUseMove(fighter: Fighter, move: MoveDefinition): boolean {
  return getCooldownKey(move) !== "upSpecial" || fighter.upSpecialAvailable;
}

function getSelfVelocityDirection(
  fighter: Fighter,
  move: MoveDefinition,
  action?: BufferedAction,
): -1 | 0 | 1 {
  if (getCooldownKey(move) === "upSpecial" && action?.moveX) {
    fighter.facing = action.moveX;
    return action.moveX;
  }

  return move.selfVelocity?.x === 0 ? 0 : fighter.facing;
}
