import { describe, expect, it } from "vitest";
import { inputConfig, shieldConfig } from "./config";
import {
  startAttack,
  updateActions,
  updateAttack,
  updateInputBuffer,
  updateShield,
} from "./actions";
import { moveDefinitions } from "./moves";
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

describe("actions", () => {
  it("buffers weak and strong attacks with directional context", () => {
    const fighter = createTestFighter({ facing: 1, grounded: true });

    updateInputBuffer(fighter, { ...idleCommand, moveX: 1, weakPressed: true });

    expect(fighter.bufferedAction).toEqual({
      button: "weak",
      direction: "forward",
      grounded: true,
      framesRemaining: inputConfig.bufferFrames,
    });
  });

  it("starts a buffered attack when actionable", () => {
    const fighter = createTestFighter({
      bufferedAction: {
        button: "strong",
        direction: "up",
        grounded: true,
        framesRemaining: 4,
      },
    });

    updateActions(fighter, idleCommand);

    expect(fighter.state).toBe("attack");
    expect(fighter.currentMoveId).toBe("groundUpStrong");
    expect(fighter.bufferedAction).toBeNull();
  });

  it("advances and ends attack recovery", () => {
    const fighter = createTestFighter();
    const move = moveDefinitions.groundNeutralWeak;

    startAttack(fighter, move);
    fighter.moveFrame = move.startupFrames + move.activeFrames + move.recoveryFrames - 1;
    updateAttack(fighter);

    expect(fighter.state).toBe("idle");
    expect(fighter.currentMoveId).toBeNull();
    expect(fighter.moveFrame).toBe(0);
  });

  it("drains and regenerates shield stamina", () => {
    const fighter = createTestFighter({ shield: 50 });

    updateShield(fighter, { ...idleCommand, shieldHeld: true });
    expect(fighter.state).toBe("shield");
    expect(fighter.shield).toBeLessThan(50);

    updateShield(fighter, { ...idleCommand, shieldHeld: false });
    expect(fighter.state).toBe("idle");
    expect(fighter.shield).toBeGreaterThan(50 - shieldConfig.holdDrainPerSecond);
  });
});
