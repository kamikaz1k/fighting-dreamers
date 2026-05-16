import { describe, expect, it } from "vitest";
import { getCharacter } from "./characters";

describe("characters", () => {
  it("defines separate character stats and movesets", () => {
    const dreamer = getCharacter("dreamer");
    const striker = getCharacter("striker");

    expect(striker.movement.maxGroundSpeed).toBeLessThan(dreamer.movement.maxGroundSpeed);
    expect(striker.shield.box.width).toBeGreaterThan(dreamer.shield.box.width);
    expect(dreamer.moves.sideSpecial.damage).toBe(11);
    expect(striker.moves.sideSpecial.damage).toBe(13);
    expect(dreamer.cooldowns.upSpecial).toBe(20);
    expect(striker.cooldowns.upSpecial).toBe(28);
  });
});
