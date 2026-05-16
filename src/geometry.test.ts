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

  it("centers neutral aerial hitboxes on the fighter", () => {
    const fighter = createTestFighter({ x: 400, facing: 1 });
    const hitbox = getMoveHitbox(fighter, moveDefinitions.airNeutralWeak);

    expect(hitbox.x).toBe(377);
    expect(hitbox.x + hitbox.width / 2).toBe(fighter.x);
  });

  it("places back aerial hitboxes behind the fighter", () => {
    const rightFacing = createTestFighter({ x: 400, facing: 1 });
    const leftFacing = createTestFighter({ x: 400, facing: -1 });

    expect(getMoveHitbox(rightFacing, moveDefinitions.airBackWeak).x).toBeLessThan(rightFacing.x);
    expect(getMoveHitbox(leftFacing, moveDefinitions.airBackWeak).x).toBeGreaterThan(leftFacing.x);
  });

  it("keeps shield collision separate from the body hurtbox", () => {
    const fighter = createTestFighter();

    expect(getShieldBox(fighter).width).toBeGreaterThan(getHurtbox(fighter).width);
    expect(getShieldBox(fighter).height).toBeGreaterThan(getHurtbox(fighter).height);
  });

  it("shrinks the hurtbox while crouching", () => {
    const standing = getHurtbox(createTestFighter());
    const crouching = getHurtbox(createTestFighter({ state: "crouch" }));

    expect(crouching.height).toBeLessThan(standing.height);
    expect(crouching.y).toBeGreaterThan(standing.y);
  });

  it("uses character-specific shield boxes", () => {
    expect(getShieldBox(createTestFighter({ characterId: "dreamer" })).width).toBe(92);
    expect(getShieldBox(createTestFighter({ characterId: "striker" })).width).toBe(104);
  });
});
