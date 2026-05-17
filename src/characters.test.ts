import { describe, expect, it } from "vitest";
import { getCharacter } from "./characters";

describe("characters", () => {
  it("defines separate character stats and movesets", () => {
    const captainFalcon = getCharacter("captainFalcon");
    const marth = getCharacter("marth");

    expect(captainFalcon.movement.maxGroundSpeed).toBeGreaterThan(marth.movement.maxGroundSpeed);
    expect(marth.moves.forwardAir.hitbox.width).toBeGreaterThan(captainFalcon.moves.forwardAir.hitbox.width);
    expect(marth.moves.forwardAir.hitboxes).toHaveLength(2);
    expect(captainFalcon.moves.neutralAir.hitWindows).toHaveLength(2);
    expect(captainFalcon.moves.forwardAir.damage).toBeGreaterThan(marth.moves.forwardAir.damage);
    expect(marth.moves.forwardAir.knockback.growth).toBeLessThan(captainFalcon.moves.forwardAir.knockback.growth);
    expect(captainFalcon.cooldowns.upSpecial).toBe(20);
    expect(marth.cooldowns.upSpecial).toBe(22);
  });
});
