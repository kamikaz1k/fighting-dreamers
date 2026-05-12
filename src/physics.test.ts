import { describe, expect, it } from "vitest";
import { movementConfig, stagePlatforms } from "./config";
import { applyMovement, canChangeFacing, shouldStartJump } from "./physics";
import { createTestFighter } from "./testHelpers";
import type { FighterCommand } from "./types";

const idleCommand: FighterCommand = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  weakPressed: false,
  strongPressed: false,
  shieldHeld: false,
};

describe("physics", () => {
  it("locks facing while attacking", () => {
    const fighter = createTestFighter({ state: "attack", facing: 1 });

    expect(canChangeFacing(fighter)).toBe(false);

    applyMovement(fighter, { ...idleCommand, moveX: -1 });

    expect(fighter.facing).toBe(1);
  });

  it("allows held up to start a grounded jump after landing cooldown", () => {
    expect(shouldStartJump(
      createTestFighter({ grounded: true, landingJumpCooldownFrames: 0 }),
      { ...idleCommand, moveY: -1 },
    )).toBe(true);

    expect(shouldStartJump(
      createTestFighter({ grounded: true, landingJumpCooldownFrames: 1 }),
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
    const dreamer = createTestFighter({ characterId: "dreamer" });
    const striker = createTestFighter({ characterId: "striker" });

    applyMovement(dreamer, { ...idleCommand, moveX: 1 });
    applyMovement(striker, { ...idleCommand, moveX: 1 });

    expect(dreamer.velocityX).toBeGreaterThan(striker.velocityX);
  });
});
