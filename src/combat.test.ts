import { describe, expect, it } from "vitest";
import { resolveAttackCollision } from "./combat";
import { moveDefinitions } from "./moves";
import { createTestFighter } from "./testHelpers";

describe("combat", () => {
  it("applies health damage, hitstun, hitstop, and hit-once tracking", () => {
    const move = moveDefinitions.groundForwardWeak;
    const attacker = createTestFighter({
      id: "attacker",
      x: 400,
      currentMoveId: move.id,
      moveFrame: move.startupFrames,
    });
    const defender = createTestFighter({ id: "defender", x: 452 });

    resolveAttackCollision(attacker, defender);
    resolveAttackCollision(attacker, defender);

    expect(defender.health).toBe(100 - move.damage);
    expect(defender.state).toBe("hitstun");
    expect(defender.velocityX).toBe(move.knockback.x);
    expect(defender.hitstopFrames).toBe(move.hitstopFrames);
    expect(attacker.hitstopFrames).toBe(move.hitstopFrames);
    expect(attacker.hitFighterIdsThisMove.has(defender.id)).toBe(true);
  });

  it("uses the shield box before the hurtbox and blocks health damage", () => {
    const move = moveDefinitions.groundForwardWeak;
    const attacker = createTestFighter({
      id: "attacker",
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

    expect(defender.health).toBe(100);
    expect(defender.shield).toBe(100 - move.shieldDamage);
    expect(defender.state).toBe("shield");
    expect(defender.velocityX).toBe(move.knockback.x * 0.35);
  });
});
