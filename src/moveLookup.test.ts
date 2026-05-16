import { describe, expect, it } from "vitest";
import { getMoveDirection, getMoveForBufferedAction } from "./moveLookup";
import { createTestFighter } from "./testHelpers";
import type { FighterCommand } from "./types";

const idleCommand: FighterCommand = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false,
  attackPressed: false,
  smashPressed: false,
  specialPressed: false,
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
      button: "attack",
      direction: "up",
      smash: false,
      grounded: true,
      framesRemaining: 6,
    }).id).toBe("upTilt");

    expect(getMoveForBufferedAction(fighter, {
      button: "attack",
      direction: "up",
      smash: false,
      grounded: false,
      framesRemaining: 6,
    }).id).toBe("upAir");
  });

  it("selects every aerial direction", () => {
    const fighter = createTestFighter();

    expect(getMoveForBufferedAction(fighter, {
      button: "attack",
      direction: "neutral",
      smash: false,
      grounded: false,
      framesRemaining: 6,
    }).id).toBe("neutralAir");
    expect(getMoveForBufferedAction(fighter, {
      button: "attack",
      direction: "back",
      smash: false,
      grounded: false,
      framesRemaining: 6,
    }).id).toBe("backAir");
  });

  it("uses side tilt for grounded back attack input", () => {
    const fighter = createTestFighter();

    expect(getMoveForBufferedAction(fighter, {
      button: "attack",
      direction: "back",
      smash: false,
      grounded: true,
      framesRemaining: 6,
    }).id).toBe("forwardTilt");
  });

  it("selects smash attacks from grounded smash input", () => {
    const fighter = createTestFighter();

    expect(getMoveForBufferedAction(fighter, {
      button: "attack",
      direction: "up",
      smash: true,
      grounded: true,
      framesRemaining: 6,
    }).id).toBe("upSmash");
  });

  it("uses side special for back special input", () => {
    const fighter = createTestFighter();

    expect(getMoveForBufferedAction(fighter, {
      button: "special",
      direction: "back",
      smash: false,
      grounded: true,
      framesRemaining: 6,
    }).id).toBe("sideSpecial");
  });

  it("selects moves from the fighter character moveset", () => {
    const dreamer = createTestFighter({ characterId: "dreamer" });
    const striker = createTestFighter({ characterId: "striker" });

    const action = {
      button: "special" as const,
      direction: "forward" as const,
      smash: false,
      grounded: true,
      framesRemaining: 6,
    };

    expect(getMoveForBufferedAction(dreamer, action).damage).toBe(11);
    expect(getMoveForBufferedAction(striker, action).damage).toBe(13);
  });
});
