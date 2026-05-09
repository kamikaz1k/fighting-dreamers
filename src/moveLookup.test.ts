import { describe, expect, it } from "vitest";
import { getMoveDirection, getMoveForBufferedAction } from "./moveLookup";
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

describe("move lookup", () => {
  it("maps horizontal input relative to facing", () => {
    expect(getMoveDirection(createTestFighter({ facing: 1 }), { ...idleCommand, moveX: 1 })).toBe("forward");
    expect(getMoveDirection(createTestFighter({ facing: 1 }), { ...idleCommand, moveX: -1 })).toBe("back");
    expect(getMoveDirection(createTestFighter({ facing: -1 }), { ...idleCommand, moveX: -1 })).toBe("forward");
  });

  it("prioritizes vertical directions over forward/back", () => {
    expect(getMoveDirection(createTestFighter({ facing: 1 }), { ...idleCommand, moveX: 1, moveY: -1 })).toBe("up");
    expect(getMoveDirection(createTestFighter({ facing: 1 }), { ...idleCommand, moveX: 1, moveY: 1 })).toBe("down");
  });

  it("selects distinct ground and air moves", () => {
    const fighter = createTestFighter();

    expect(getMoveForBufferedAction(fighter, {
      button: "weak",
      direction: "up",
      grounded: true,
      framesRemaining: 6,
    }).id).toBe("groundUpWeak");

    expect(getMoveForBufferedAction(fighter, {
      button: "weak",
      direction: "up",
      grounded: false,
      framesRemaining: 6,
    }).id).toBe("airUpWeak");
  });
});
