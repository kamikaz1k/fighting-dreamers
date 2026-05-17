import { describe, expect, it } from "vitest";
import { getCharacter } from "./characters";
import { getLaunchSpeed, getResolvedHit, getScaledKnockback, resolveAttackCollision } from "./combat";
import { createTestFighter } from "./testHelpers";

describe("combat", () => {
  it("applies damage percent, scaled knockback, hitstun, hitstop, and hit-once tracking", () => {
    const move = getCharacter("marth").moves.forwardTilt;
    const attacker = createTestFighter({
      id: "attacker",
      x: 400,
      currentMoveId: move.id,
      moveFrame: move.startupFrames,
    });
    const defender = createTestFighter({ id: "defender", x: 452 });

    resolveAttackCollision(attacker, defender);
    resolveAttackCollision(attacker, defender);

    const knockback = getScaledKnockback(move, move.damage);

    expect(defender.damagePercent).toBe(move.damage);
    expect(defender.state).toBe("hitstun");
    expect(defender.velocityX).toBe(knockback.x);
    expect(defender.hitstopFrames).toBe(move.hitstopFrames);
    expect(attacker.hitstopFrames).toBe(move.hitstopFrames);
    expect(attacker.hitFighterIdsThisMove.has(defender.id)).toBe(true);
  });

  it("uses the shield box before the hurtbox and blocks damage", () => {
    const move = getCharacter("captainFalcon").moves.forwardTilt;
    const attacker = createTestFighter({
      id: "attacker",
      characterId: "captainFalcon",
      x: 400,
      currentMoveId: move.id,
      moveFrame: move.startupFrames,
    });
    const defender = createTestFighter({
      id: "defender",
      x: 490,
      state: "shield",
    });

    resolveAttackCollision(attacker, defender);

    expect(defender.damagePercent).toBe(0);
    expect(defender.shield).toBe(100 - move.shieldDamage);
    expect(defender.state).toBe("shield");
    expect(defender.velocityX).toBe(getLaunchSpeed(move, 0) * 0.35);
  });

  it("uses the first matching sweetspot hitbox overrides", () => {
    const move = getCharacter("marth").moves.forwardTilt;
    const sweetspot = move.hitboxes?.[0];
    const attacker = createTestFighter({
      id: "attacker",
      x: 400,
      currentMoveId: move.id,
      moveFrame: move.startupFrames,
    });
    const defender = createTestFighter({ id: "defender", x: 520 });

    if (!sweetspot) {
      throw new Error("Expected Marth forward tilt to define a sweetspot");
    }

    resolveAttackCollision(attacker, defender);

    const resolvedHit = getResolvedHit(move, sweetspot);
    const knockback = getScaledKnockback(resolvedHit, resolvedHit.damage);

    expect(defender.damagePercent).toBe(resolvedHit.damage);
    expect(defender.velocityX).toBe(knockback.x);
    expect(defender.hitstopFrames).toBe(resolvedHit.hitstopFrames);
  });

  it("scales knockback with accumulated damage", () => {
    const move = getCharacter("marth").moves.forwardTilt;

    expect(getLaunchSpeed(move, 50)).toBe(
      move.knockback.base + move.knockback.growth * 50 + move.damage * move.knockback.damageFactor,
    );
    expect(getScaledKnockback(move, 100).x).toBeGreaterThan(getScaledKnockback(move, 0).x);
    expect(Math.abs(getScaledKnockback(move, 100).y)).toBeGreaterThan(
      Math.abs(getScaledKnockback(move, 0).y),
    );
  });
});
