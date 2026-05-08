import { describe, expect, it } from "vitest";
import { getHurtbox, getMoveHitbox, getShieldBox, rectsOverlap } from "./geometry";
import { moveDefinitions } from "./moves";
import { createTestFighter } from "./testHelpers";

describe("geometry", () => {
  it("detects overlapping rectangles", () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 9, y: 9, width: 10, height: 10 },
    )).toBe(true);
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it("mirrors move hitboxes around fighter facing", () => {
    const move = moveDefinitions.groundForwardWeak;
    const right = getMoveHitbox(createTestFighter({ x: 400, facing: 1 }), move);
    const left = getMoveHitbox(createTestFighter({ x: 400, facing: -1 }), move);

    expect(right.x).toBe(428);
    expect(left.x).toBe(324);
  });

  it("keeps shield collision separate from the body hurtbox", () => {
    const fighter = createTestFighter();

    expect(getShieldBox(fighter).width).toBeGreaterThan(getHurtbox(fighter).width);
    expect(getShieldBox(fighter).height).toBeGreaterThan(getHurtbox(fighter).height);
  });
});
