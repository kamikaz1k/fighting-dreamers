import { describe, expect, it } from "vitest";
import { movementConfig } from "./config";
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

  it("sets landing jump cooldown when touching down", () => {
    const fighter = createTestFighter({
      grounded: false,
      y: 449,
      velocityY: 200,
    });

    applyMovement(fighter, idleCommand);

    expect(fighter.grounded).toBe(true);
    expect(fighter.landingJumpCooldownFrames).toBe(movementConfig.landingJumpCooldownFrames);
  });
});
