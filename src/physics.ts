import {
  FIXED_TIMESTEP_SECONDS,
  FLOOR_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
} from "./config";
import { getCharacter } from "./characters";
import { getCurrentMove } from "./combat";
import { clamp, moveToward } from "./math";
import type { Fighter, FighterCommand } from "./types";

export function updateMovementState(fighter: Fighter): void {
  if (
    fighter.state === "attack"
    || fighter.state === "shield"
    || fighter.state === "hitstun"
    || fighter.state === "ko"
  ) {
    return;
  }

  if (!fighter.grounded) {
    fighter.state = fighter.velocityY < 0 ? "jump" : "fall";
    return;
  }

  fighter.state = Math.abs(fighter.velocityX) > 5 ? "run" : "idle";
}

export function applyMovement(fighter: Fighter, command: FighterCommand): void {
  const wasGrounded = fighter.grounded;
  const movement = getCharacter(fighter.characterId).movement;
  const acceleration = fighter.grounded
    ? movement.groundAcceleration
    : movement.airAcceleration;
  const maxSpeed = fighter.grounded ? movement.maxGroundSpeed : movement.maxAirSpeed;

  if (command.moveX !== 0) {
    if (canChangeFacing(fighter)) {
      fighter.facing = command.moveX;
    }

    fighter.velocityX += command.moveX * acceleration * FIXED_TIMESTEP_SECONDS;
  } else if (fighter.grounded) {
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movement.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
  }

  fighter.velocityX = clamp(fighter.velocityX, -maxSpeed, maxSpeed);

  if (fighter.state === "attack") {
    fighter.velocityX *= getCurrentMove(fighter)?.movementMultiplier ?? 1;
  }

  if (fighter.grounded && fighter.landingJumpCooldownFrames > 0) {
    fighter.landingJumpCooldownFrames -= 1;
  }

  if (shouldStartJump(fighter, command)) {
    startJump(fighter);
  }

  if (fighter.state === "shield") {
    fighter.velocityX = 0;
  }

  if (!fighter.grounded) {
    fighter.velocityY += movement.gravity * FIXED_TIMESTEP_SECONDS;
  }

  fighter.x += fighter.velocityX * FIXED_TIMESTEP_SECONDS;
  fighter.y += fighter.velocityY * FIXED_TIMESTEP_SECONDS;

  const halfWidth = fighter.width / 2;
  const minX = STAGE_LEFT + halfWidth;
  const maxX = STAGE_RIGHT - halfWidth;

  if (fighter.x < minX) {
    fighter.x = minX;
    fighter.velocityX = Math.max(0, fighter.velocityX);
  } else if (fighter.x > maxX) {
    fighter.x = maxX;
    fighter.velocityX = Math.min(0, fighter.velocityX);
  }

  if (fighter.y >= FLOOR_Y) {
    fighter.y = FLOOR_Y;
    fighter.velocityY = 0;
    fighter.grounded = true;
    fighter.airJumpsRemaining = movement.maxAirJumps;

    if (!wasGrounded) {
      fighter.landingJumpCooldownFrames = movement.landingJumpCooldownFrames;
    }
  }
}

export function canChangeFacing(fighter: Fighter): boolean {
  return fighter.state !== "attack"
    && fighter.state !== "hitstun"
    && fighter.state !== "ko";
}

export function shouldStartJump(fighter: Fighter, command: FighterCommand): boolean {
  const wantsJump = command.jumpPressed || command.moveY === -1;

  if (!wantsJump || fighter.state === "hitstun" || fighter.state === "ko") {
    return false;
  }

  if (fighter.grounded) {
    return fighter.landingJumpCooldownFrames === 0;
  }

  return fighter.airJumpsRemaining > 0;
}

export function startJump(fighter: Fighter): void {
  if (!fighter.grounded) {
    fighter.airJumpsRemaining = Math.max(0, fighter.airJumpsRemaining - 1);
  }

  fighter.velocityY = getCharacter(fighter.characterId).movement.jumpVelocity;
  fighter.grounded = false;

  if (fighter.state === "shield") {
    fighter.state = "jump";
  }
}
