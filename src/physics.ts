import {
  FIXED_TIMESTEP_SECONDS,
  FLOOR_Y,
  ledgeConfig,
  mainPlatform,
  stagePlatforms,
} from "./config";
import { getCharacter } from "./characters";
import { getCurrentMove } from "./combat";
import { clamp, moveToward } from "./math";
import type { Fighter, FighterCommand, StagePlatform } from "./types";

export function updateMovementState(fighter: Fighter): void {
  if (
    fighter.state === "attack"
    || fighter.state === "shield"
    || fighter.state === "ledge"
    || fighter.state === "hitstun"
    || fighter.state === "ko"
  ) {
    return;
  }

  if (!fighter.grounded) {
    fighter.state = fighter.velocityY < 0 ? "jump" : "fall";
    return;
  }

  if (fighter.state === "crouch") {
    return;
  }

  fighter.state = Math.abs(fighter.velocityX) > 5 ? "run" : "idle";
}

export function applyMovement(fighter: Fighter, command: FighterCommand): void {
  if (fighter.state === "ledge") {
    updateLedgeState(fighter, command);
    return;
  }

  const wasGrounded = fighter.grounded;
  const previousY = fighter.y;
  const movement = getCharacter(fighter.characterId).movement;
  const acceleration = fighter.grounded
    ? movement.groundAcceleration
    : movement.airAcceleration;
  const maxSpeed = fighter.grounded ? movement.maxGroundSpeed : movement.maxAirSpeed;

  if (fighter.grounded && command.moveY === 1 && isOnAnyPlatform(fighter)) {
    fighter.grounded = false;
  } else if (fighter.grounded && !isSupported(fighter)) {
    fighter.grounded = false;
  }

  updateCrouchState(fighter, command);

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
    updateAirborneJumpState(fighter, command);
    const gravityMultiplier = fighter.fastFalling ? movement.fastFallGravityMultiplier : 1;
    const maxFallSpeed = fighter.fastFalling ? movement.fastFallSpeed : movement.maxFallSpeed;
    fighter.velocityY = Math.min(
      fighter.velocityY + movement.gravity * gravityMultiplier * FIXED_TIMESTEP_SECONDS,
      maxFallSpeed,
    );
  }

  fighter.x += fighter.velocityX * FIXED_TIMESTEP_SECONDS;
  fighter.y += fighter.velocityY * FIXED_TIMESTEP_SECONDS;

  if (hitsMainPlatformUnderside(fighter, previousY)) {
    fighter.y = mainPlatform.y + mainPlatform.height + fighter.height;
    fighter.velocityY = 0;
  }

  const ledgeSide = getGrabbableLedgeSide(fighter);

  if (ledgeSide) {
    grabLedge(fighter, ledgeSide);
    return;
  }

  const platform = getLandingPlatform(fighter, previousY, command);

  if (platform) {
    landFighter(fighter, platform.y, wasGrounded, movement.maxAirJumps);
    return;
  }

  if (canLandOnMainPlatform(fighter, previousY)) {
    landFighter(fighter, FLOOR_Y, wasGrounded, movement.maxAirJumps);
  }
}

function landFighter(
  fighter: Fighter,
  y: number,
  wasGrounded: boolean,
  maxAirJumps: number,
): void {
  fighter.y = y;
  fighter.velocityY = 0;
  fighter.grounded = true;
  fighter.airJumpsRemaining = maxAirJumps;
  fighter.jumpHoldFrames = 0;
  fighter.jumpCutApplied = false;
  fighter.fastFalling = false;
  fighter.ledgeSide = null;

  if (!wasGrounded) {
    fighter.landingJumpCooldownFrames = getCharacter(
      fighter.characterId,
    ).movement.landingJumpCooldownFrames;
  }
}

function isSupported(fighter: Fighter): boolean {
  if (isOnPlatform(fighter, mainPlatform)) {
    return true;
  }

  return stagePlatforms.some((platform) => isOnPlatform(fighter, platform));
}

function canLandOnMainPlatform(fighter: Fighter, previousY: number): boolean {
  return fighter.velocityY >= 0
    && previousY <= mainPlatform.y
    && fighter.y >= mainPlatform.y
    && isWithinPlatformWidth(fighter, mainPlatform);
}

function hitsMainPlatformUnderside(fighter: Fighter, previousY: number): boolean {
  const undersideY = mainPlatform.y + mainPlatform.height;
  const previousTop = previousY - fighter.height;
  const currentTop = fighter.y - fighter.height;

  return fighter.velocityY < 0
    && previousTop >= undersideY
    && currentTop <= undersideY
    && isWithinPlatformWidth(fighter, mainPlatform);
}

function getGrabbableLedgeSide(fighter: Fighter): -1 | 1 | null {
  if (fighter.grounded || fighter.velocityY < 0 || fighter.state === "hitstun") {
    return null;
  }

  const verticalDistance = fighter.y - mainPlatform.y;

  if (verticalDistance < 0 || verticalDistance > ledgeConfig.grabHeight) {
    return null;
  }

  const leftLedgeDistance = Math.abs(fighter.x - mainPlatform.x);

  if (leftLedgeDistance <= ledgeConfig.grabWidth && fighter.x < mainPlatform.x) {
    return -1;
  }

  const rightEdgeX = mainPlatform.x + mainPlatform.width;
  const rightLedgeDistance = Math.abs(fighter.x - rightEdgeX);

  if (rightLedgeDistance <= ledgeConfig.grabWidth && fighter.x > rightEdgeX) {
    return 1;
  }

  return null;
}

function grabLedge(fighter: Fighter, side: -1 | 1): void {
  const edgeX = side === -1 ? mainPlatform.x : mainPlatform.x + mainPlatform.width;

  fighter.state = "ledge";
  fighter.ledgeSide = side;
  fighter.x = edgeX + side * ledgeConfig.hangInset;
  fighter.y = mainPlatform.y + fighter.height;
  fighter.velocityX = 0;
  fighter.velocityY = 0;
  fighter.grounded = false;
  fighter.fastFalling = false;
}

function updateLedgeState(fighter: Fighter, command: FighterCommand): void {
  if (!command.jumpPressed || !fighter.ledgeSide) {
    return;
  }

  const edgeX = fighter.ledgeSide === -1
    ? mainPlatform.x
    : mainPlatform.x + mainPlatform.width;

  fighter.x = edgeX - fighter.ledgeSide * (fighter.width / 2 + ledgeConfig.climbInset);
  fighter.y = mainPlatform.y;
  fighter.grounded = true;
  fighter.ledgeSide = null;
  fighter.state = "idle";
  fighter.airJumpsRemaining = getCharacter(fighter.characterId).movement.maxAirJumps;
}

function isOnAnyPlatform(fighter: Fighter): boolean {
  return stagePlatforms.some((platform) => isOnPlatform(fighter, platform));
}

function getLandingPlatform(
  fighter: Fighter,
  previousY: number,
  command: FighterCommand,
): StagePlatform | null {
  if (fighter.velocityY < 0 || command.moveY === 1) {
    return null;
  }

  for (const platform of stagePlatforms) {
    if (
      previousY <= platform.y
      && fighter.y >= platform.y
      && isWithinPlatformWidth(fighter, platform)
    ) {
      return platform;
    }
  }

  return null;
}

function isOnPlatform(fighter: Fighter, platform: StagePlatform): boolean {
  return Math.abs(fighter.y - platform.y) < 0.5
    && isWithinPlatformWidth(fighter, platform);
}

function isWithinPlatformWidth(fighter: Fighter, platform: StagePlatform): boolean {
  const halfWidth = fighter.width / 2;
  return fighter.x + halfWidth > platform.x
    && fighter.x - halfWidth < platform.x + platform.width;
}

export function canChangeFacing(fighter: Fighter): boolean {
  return fighter.state !== "attack"
    && fighter.state !== "hitstun"
    && fighter.state !== "ko";
}

function updateCrouchState(fighter: Fighter, command: FighterCommand): void {
  if (!fighter.grounded || isOnAnyPlatform(fighter)) {
    if (fighter.state === "crouch") {
      fighter.state = "idle";
    }
    return;
  }

  if (command.moveY === 1 && fighter.state !== "attack" && fighter.state !== "shield") {
    fighter.state = "crouch";
    fighter.velocityX = 0;
    return;
  }

  if (fighter.state === "crouch") {
    fighter.state = "idle";
  }
}

export function shouldStartJump(fighter: Fighter, command: FighterCommand): boolean {
  if (fighter.state === "hitstun" || fighter.state === "ko") {
    return false;
  }

  if (fighter.grounded) {
    const wantsGroundJump = command.jumpPressed || command.moveY === -1;
    return wantsGroundJump && fighter.landingJumpCooldownFrames === 0;
  }

  return command.jumpPressed && fighter.airJumpsRemaining > 0;
}

export function startJump(fighter: Fighter): void {
  if (!fighter.grounded) {
    fighter.airJumpsRemaining = Math.max(0, fighter.airJumpsRemaining - 1);
  }

  fighter.velocityY = getCharacter(fighter.characterId).movement.jumpVelocity;
  fighter.grounded = false;
  fighter.jumpHoldFrames = 0;
  fighter.jumpCutApplied = false;
  fighter.fastFalling = false;
  fighter.ledgeSide = null;

  if (fighter.state === "shield") {
    fighter.state = "jump";
  }
}

function updateAirborneJumpState(fighter: Fighter, command: FighterCommand): void {
  const movement = getCharacter(fighter.characterId).movement;

  fighter.jumpHoldFrames += 1;

  if (
    command.jumpReleased
    && !fighter.jumpCutApplied
    && fighter.velocityY < movement.shortHopVelocity
    && fighter.jumpHoldFrames <= movement.shortHopReleaseFrames
  ) {
    fighter.velocityY = movement.shortHopVelocity;
    fighter.jumpCutApplied = true;
  }

  if (fighter.velocityY > 0 && command.moveY === 1) {
    fighter.fastFalling = true;
  }
}
