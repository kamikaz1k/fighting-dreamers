import { describe, expect, it } from "vitest";
import { mainPlatform, movementConfig, stagePlatforms } from "./config";
import {
  applyMovement,
  canChangeFacing,
  shouldStartJump,
  updateMovementState,
} from "./physics";
import { createTestFighter } from "./testHelpers";
import type { FighterCommand } from "./types";

const idleCommand: FighterCommand = {
  moveX: 0,
  moveXPressed: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false,
  attackPressed: false,
  smashPressed: false,
  specialPressed: false,
  shieldHeld: false,
};

describe("physics", () => {
  it("locks facing while attacking", () => {
    const fighter = createTestFighter({ state: "attack", facing: 1 });

    expect(canChangeFacing(fighter)).toBe(false);

    applyMovement(fighter, { ...idleCommand, moveX: -1 });

    expect(fighter.facing).toBe(1);
  });

  it("locks facing while airborne", () => {
    const fighter = createTestFighter({
      grounded: false,
      y: 300,
      facing: 1,
    });

    expect(canChangeFacing(fighter)).toBe(false);

    applyMovement(fighter, { ...idleCommand, moveX: -1 });

    expect(fighter.facing).toBe(1);
  });

  it("starts a character-specific dash on a fresh horizontal press", () => {
    const captainFalcon = createTestFighter({ characterId: "captainFalcon" });
    const marth = createTestFighter({ characterId: "marth" });

    applyMovement(captainFalcon, { ...idleCommand, moveX: 1, moveXPressed: 1 });
    applyMovement(marth, { ...idleCommand, moveX: 1, moveXPressed: 1 });
    updateMovementState(captainFalcon);
    updateMovementState(marth);

    expect(captainFalcon.state).toBe("dash");
    expect(marth.state).toBe("dash");
    expect(captainFalcon.velocityX).toBe(338);
    expect(marth.velocityX).toBe(241);
    expect(captainFalcon.dashFramesRemaining).toBe(15);
  });

  it("transitions from dash into run after the dash window ends", () => {
    const fighter = createTestFighter({
      state: "dash",
      dashDirection: 1,
      dashFramesRemaining: 1,
    });

    applyMovement(fighter, { ...idleCommand, moveX: 1 });
    updateMovementState(fighter);

    expect(fighter.dashFramesRemaining).toBe(0);
    expect(fighter.dashDirection).toBeNull();
    expect(fighter.state).toBe("run");
  });

  it("restarts dash in the opposite direction on a fresh reverse press", () => {
    const fighter = createTestFighter({
      state: "dash",
      facing: 1,
      dashDirection: 1,
      dashFramesRemaining: 8,
      velocityX: 338,
    });

    applyMovement(fighter, { ...idleCommand, moveX: -1, moveXPressed: -1 });
    updateMovementState(fighter);

    expect(fighter.state).toBe("dash");
    expect(fighter.facing).toBe(-1);
    expect(fighter.velocityX).toBe(-241);
    expect(fighter.dashFramesRemaining).toBe(15);
  });

  it("preserves existing aerial momentum while attacking", () => {
    const fighter = createTestFighter({
      state: "attack",
      currentMoveId: "neutralAir",
      grounded: false,
      y: 300,
      velocityX: 180,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.velocityX).toBe(180);
  });

  it("still allows reduced steering during aerial attacks", () => {
    const fighter = createTestFighter({
      state: "attack",
      currentMoveId: "neutralAir",
      grounded: false,
      y: 300,
      velocityX: 0,
    });

    applyMovement(fighter, { ...idleCommand, moveX: 1 });

    expect(fighter.velocityX).toBeGreaterThan(0);
    expect(fighter.velocityX).toBeLessThan(
      movementConfig.airAcceleration * (1 / 60),
    );
  });

  it("requires jump press to start a grounded jump after landing cooldown", () => {
    expect(shouldStartJump(
      createTestFighter({ grounded: true, landingJumpCooldownFrames: 0 }),
      { ...idleCommand, jumpPressed: true },
    )).toBe(true);

    expect(shouldStartJump(
      createTestFighter({ grounded: true, landingJumpCooldownFrames: 1 }),
      { ...idleCommand, jumpPressed: true },
    )).toBe(false);

    expect(shouldStartJump(
      createTestFighter({ grounded: true, landingJumpCooldownFrames: 0 }),
      { ...idleCommand, moveY: -1 },
    )).toBe(false);
  });

  it("allows jumping out of shield", () => {
    const fighter = createTestFighter({
      state: "shield",
      grounded: true,
      landingJumpCooldownFrames: 0,
    });

    expect(shouldStartJump(fighter, { ...idleCommand, jumpPressed: true })).toBe(true);

    applyMovement(fighter, { ...idleCommand, jumpPressed: true });

    expect(fighter.state).toBe("jump");
    expect(fighter.grounded).toBe(false);
  });

  it("does not start a grounded jump while attacking", () => {
    const fighter = createTestFighter({
      state: "attack",
      grounded: true,
    });

    expect(shouldStartJump(fighter, { ...idleCommand, jumpPressed: true })).toBe(false);
  });

  it("consumes one air jump while airborne", () => {
    const fighter = createTestFighter({
      grounded: false,
      airJumpsRemaining: 1,
    });

    expect(shouldStartJump(fighter, { ...idleCommand, jumpPressed: true })).toBe(true);

    applyMovement(fighter, { ...idleCommand, jumpPressed: true });

    expect(fighter.airJumpsRemaining).toBe(0);
    expect(shouldStartJump(fighter, { ...idleCommand, jumpPressed: true })).toBe(false);
  });

  it("requires a fresh jump press for air jumps", () => {
    const fighter = createTestFighter({
      grounded: false,
      airJumpsRemaining: 1,
    });

    expect(shouldStartJump(fighter, { ...idleCommand, moveY: -1 })).toBe(false);

    applyMovement(fighter, { ...idleCommand, moveY: -1 });

    expect(fighter.airJumpsRemaining).toBe(1);
  });

  it("cuts upward velocity for an early jump release", () => {
    const fighter = createTestFighter({
      grounded: false,
      velocityY: movementConfig.jumpVelocity,
      jumpHoldFrames: 2,
    });

    applyMovement(fighter, { ...idleCommand, jumpReleased: true });

    expect(fighter.jumpCutApplied).toBe(true);
    expect(fighter.velocityY).toBeGreaterThan(movementConfig.jumpVelocity);
    expect(fighter.velocityY).toBeGreaterThan(movementConfig.shortHopVelocity);
  });

  it("keeps full-hop velocity after the short-hop window", () => {
    const fighter = createTestFighter({
      grounded: false,
      velocityY: movementConfig.jumpVelocity,
      jumpHoldFrames: movementConfig.shortHopReleaseFrames,
    });

    applyMovement(fighter, { ...idleCommand, jumpReleased: true });

    expect(fighter.jumpCutApplied).toBe(false);
    expect(fighter.velocityY).toBeLessThan(movementConfig.shortHopVelocity);
  });

  it("starts fast-fall only while descending", () => {
    const rising = createTestFighter({
      grounded: false,
      y: 300,
      velocityY: -50,
    });
    const falling = createTestFighter({
      grounded: false,
      y: 300,
      velocityY: 50,
    });

    applyMovement(rising, { ...idleCommand, moveY: 1 });
    applyMovement(falling, { ...idleCommand, moveY: 1 });

    expect(rising.fastFalling).toBe(false);
    expect(falling.fastFalling).toBe(true);
    expect(falling.velocityY).toBeGreaterThan(rising.velocityY);
  });

  it("enters crouch while holding down on the floor", () => {
    const fighter = createTestFighter();

    applyMovement(fighter, { ...idleCommand, moveY: 1 });
    updateMovementState(fighter);

    expect(fighter.state).toBe("crouch");
    expect(fighter.grounded).toBe(true);
  });

  it("exits crouch after releasing down", () => {
    const fighter = createTestFighter({ state: "crouch" });

    applyMovement(fighter, idleCommand);
    updateMovementState(fighter);

    expect(fighter.state).toBe("idle");
  });

  it("sets landing jump cooldown when touching down", () => {
    const fighter = createTestFighter({
      grounded: false,
      y: 449,
      velocityY: 200,
      airJumpsRemaining: 0,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(true);
    expect(fighter.landingJumpCooldownFrames).toBe(movementConfig.landingJumpCooldownFrames);
    expect(fighter.airJumpsRemaining).toBe(movementConfig.maxAirJumps);
    expect(fighter.fastFalling).toBe(false);
  });

  it("falls after walking off the main platform", () => {
    const fighter = createTestFighter({
      x: mainPlatform.x + mainPlatform.width + 60,
      y: mainPlatform.y,
      grounded: true,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeGreaterThan(mainPlatform.y);
  });

  it("falls through disabled side platforms", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: true,
      x: platform.x + platform.width / 2,
      y: platform.y,
    });

    applyMovement(fighter, idleCommand, false);

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeGreaterThan(platform.y);
  });

  it("does not land on disabled side platforms", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: false,
      x: platform.x + platform.width / 2,
      y: platform.y - 2,
      velocityY: 180,
    });

    applyMovement(fighter, idleCommand, false);

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeGreaterThan(platform.y);
  });

  it("does not land on empty space beside the main platform", () => {
    const fighter = createTestFighter({
      grounded: false,
      x: mainPlatform.x - 60,
      y: mainPlatform.y - 2,
      velocityY: 180,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeGreaterThan(mainPlatform.y);
  });

  it("blocks jumps into the underside of the main platform", () => {
    const fighter = createTestFighter({
      grounded: false,
      x: mainPlatform.x + mainPlatform.width / 2,
      y: mainPlatform.y + mainPlatform.height + 84,
      velocityY: -220,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.y).toBe(mainPlatform.y + mainPlatform.height + fighter.height);
    expect(fighter.velocityY).toBe(0);
    expect(fighter.grounded).toBe(false);
  });

  it("grabs a ledge while falling near the main platform edge", () => {
    const fighter = createTestFighter({
      grounded: false,
      x: mainPlatform.x - 10,
      y: mainPlatform.y + 20,
      facing: 1,
      velocityY: 120,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.state).toBe("ledge");
    expect(fighter.ledgeSide).toBe(-1);
    expect(fighter.velocityY).toBe(0);
  });

  it("does not grab a ledge while facing away from it", () => {
    const fighter = createTestFighter({
      grounded: false,
      x: mainPlatform.x - 10,
      y: mainPlatform.y + 20,
      facing: -1,
      velocityY: 120,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.state).not.toBe("ledge");
    expect(fighter.ledgeSide).toBeNull();
  });

  it("recovers from ledge onto the stage with jump", () => {
    const fighter = createTestFighter({
      grounded: false,
      state: "ledge",
      ledgeSide: 1,
      x: mainPlatform.x + mainPlatform.width + 12,
      y: mainPlatform.y + 83,
      airJumpsRemaining: 0,
    });

    applyMovement(fighter, { ...idleCommand, jumpPressed: true });

    expect(fighter.state).toBe("idle");
    expect(fighter.grounded).toBe(true);
    expect(fighter.ledgeSide).toBeNull();
    expect(fighter.x).toBeLessThan(mainPlatform.x + mainPlatform.width);
    expect(fighter.y).toBe(mainPlatform.y);
    expect(fighter.airJumpsRemaining).toBe(movementConfig.maxAirJumps);
  });

  it("lands on a platform from above", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: false,
      x: platform.x + platform.width / 2,
      y: platform.y - 2,
      velocityY: 180,
      airJumpsRemaining: 0,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(true);
    expect(fighter.y).toBe(platform.y);
    expect(fighter.velocityY).toBe(0);
    expect(fighter.airJumpsRemaining).toBe(movementConfig.maxAirJumps);
  });

  it("passes upward through platforms", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: false,
      x: platform.x + platform.width / 2,
      y: platform.y + 2,
      velocityY: -220,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeLessThan(platform.y + 2);
  });

  it("drops through platforms while holding down", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: true,
      x: platform.x + platform.width / 2,
      y: platform.y,
      velocityY: 80,
    });

    applyMovement(fighter, { ...idleCommand, moveY: 1 });

    expect(fighter.grounded).toBe(false);
    expect(fighter.y).toBeGreaterThan(platform.y);
  });

  it("falls after walking off a platform", () => {
    const platform = stagePlatforms[0];
    const fighter = createTestFighter({
      grounded: true,
      x: platform.x + platform.width + 60,
      y: platform.y,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(false);
  });

  it("uses character-specific movement config", () => {
    const captainFalcon = createTestFighter({ characterId: "captainFalcon" });
    const marth = createTestFighter({ characterId: "marth" });

    applyMovement(captainFalcon, { ...idleCommand, moveX: 1 });
    applyMovement(marth, { ...idleCommand, moveX: 1 });

    expect(captainFalcon.velocityX).toBeGreaterThan(marth.velocityX);
  });
});
