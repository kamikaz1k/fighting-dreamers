import {
  FIXED_TIMESTEP_SECONDS,
  FLOOR_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
  movementConfig,
} from "./config";
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
  const acceleration = fighter.grounded
    ? movementConfig.groundAcceleration
    : movementConfig.airAcceleration;
  const maxSpeed = fighter.grounded ? movementConfig.maxGroundSpeed : movementConfig.maxAirSpeed;

  if (command.moveX !== 0) {
    if (canChangeFacing(fighter)) {
      fighter.facing = command.moveX;
    }

    fighter.velocityX += command.moveX * acceleration * FIXED_TIMESTEP_SECONDS;
  } else if (fighter.grounded) {
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movementConfig.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
  }

  fighter.velocityX = clamp(fighter.velocityX, -maxSpeed, maxSpeed);

  if (fighter.state === "attack") {
    fighter.velocityX *= getCurrentMove(fighter)?.movementMultiplier ?? 1;
  }

  if (fighter.state === "shield") {
    fighter.velocityX = 0;
  }

  if (fighter.grounded && fighter.landingJumpCooldownFrames > 0) {
    fighter.landingJumpCooldownFrames -= 1;
  }

  if (shouldStartJump(fighter, command)) {
    startJump(fighter);
  }

  if (!fighter.grounded) {
    fighter.velocityY += movementConfig.gravity * FIXED_TIMESTEP_SECONDS;
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

    if (!wasGrounded) {
      fighter.landingJumpCooldownFrames = movementConfig.landingJumpCooldownFrames;
    }
  }
}

export function canChangeFacing(fighter: Fighter): boolean {
  return fighter.state !== "attack"
    && fighter.state !== "hitstun"
    && fighter.state !== "ko";
}

export function shouldStartJump(fighter: Fighter, command: FighterCommand): boolean {
  return fighter.grounded
    && fighter.landingJumpCooldownFrames === 0
    && fighter.state !== "hitstun"
    && fighter.state !== "shield"
    && (command.jumpPressed || command.moveY === -1);
}

export function startJump(fighter: Fighter): void {
  fighter.velocityY = movementConfig.jumpVelocity;
  fighter.grounded = false;
}
