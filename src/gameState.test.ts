import { describe, expect, it } from "vitest";
import { FLOOR_Y, blastZoneConfig, roundConfig } from "./config";
import {
  createInitialFighters,
  getFallbackSpawnPoint,
  isOutsideBlastZone,
  resetFighter,
  resetRound,
  updateRoundFlow,
} from "./gameState";
import { createTestFighter } from "./testHelpers";

describe("game state", () => {
  it("resets a fighter's transient combat state", () => {
    const fighter = createTestFighter({
      state: "hitstun",
      x: 100,
      y: 120,
      facing: -1,
      velocityX: 400,
      velocityY: -200,
      grounded: false,
      damagePercent: 75,
      shield: 12,
      currentMoveId: "groundForwardWeak",
      moveFrame: 8,
      hitstopFrames: 4,
      hitstunFrames: 11,
      landingJumpCooldownFrames: 3,
      bufferedAction: {
        button: "attack",
        direction: "forward",
        grounded: true,
        framesRemaining: 2,
      },
    });
    fighter.hitFighterIdsThisMove.add("target");
    fighter.moveCooldowns.set("groundUpStrong", 12);

    resetFighter(fighter, 500, 1);

    expect(fighter.state).toBe("idle");
    expect(fighter.x).toBe(500);
    expect(fighter.y).toBe(FLOOR_Y);
    expect(fighter.facing).toBe(1);
    expect(fighter.damagePercent).toBe(0);
    expect(fighter.shield).toBe(fighter.maxShield);
    expect(fighter.currentMoveId).toBeNull();
    expect(fighter.moveCooldowns.size).toBe(0);
    expect(fighter.hitFighterIdsThisMove.size).toBe(0);
    expect(fighter.bufferedAction).toBeNull();
  });

  it("creates fighters from character definitions", () => {
    const [player, cpu] = createInitialFighters();

    expect(player.characterId).toBe("dreamer");
    expect(player.width).toBe(52);
    expect(player.height).toBe(83);
    expect(player.maxShield).toBe(100);
    expect(player.airJumpsRemaining).toBe(1);
    expect(cpu.characterId).toBe("striker");
    expect(cpu.width).toBe(58);
    expect(cpu.height).toBe(86);
    expect(cpu.maxShield).toBe(90);
  });

  it("supports fallback spawn points beyond configured slots", () => {
    const spawn = getFallbackSpawnPoint(4, 5);

    expect(spawn.x).toBeGreaterThan(40);
    expect(spawn.x).toBeLessThan(920);
    expect(spawn.facing).toBe(-1);
  });

  it("does not start KO pause from accumulated damage alone", () => {
    const fighters = createInitialFighters();
    fighters[1].damagePercent = 999;

    const nextRoundState = updateRoundFlow(fighters, {
      roundPauseFrames: 0,
      winnerName: null,
    });

    expect(nextRoundState.winnerName).toBeNull();
    expect(nextRoundState.roundPauseFrames).toBe(0);
    expect(fighters[1].state).toBe("idle");
  });

  it("starts KO pause when a fighter crosses a blast zone", () => {
    const fighters = createInitialFighters();
    fighters[1].x = blastZoneConfig.right + 1;

    const nextRoundState = updateRoundFlow(fighters, {
      roundPauseFrames: 0,
      winnerName: null,
    });

    expect(nextRoundState.winnerName).toBe("Player 1");
    expect(nextRoundState.roundPauseFrames).toBe(roundConfig.koPauseFrames);
    expect(fighters[1].state).toBe("ko");
  });

  it("detects blast zones on every side", () => {
    expect(isOutsideBlastZone(createTestFighter({ x: blastZoneConfig.left - 1 }))).toBe(true);
    expect(isOutsideBlastZone(createTestFighter({ x: blastZoneConfig.right + 1 }))).toBe(true);
    expect(isOutsideBlastZone(createTestFighter({
      y: blastZoneConfig.top + createTestFighter().height - 1,
    }))).toBe(true);
    expect(isOutsideBlastZone(createTestFighter({ y: blastZoneConfig.bottom + 1 }))).toBe(true);
  });

  it("resets the round when KO pause expires", () => {
    const fighters = createInitialFighters();
    fighters[0].x = blastZoneConfig.left - 1;
    fighters[0].state = "ko";

    const nextRoundState = updateRoundFlow(fighters, {
      roundPauseFrames: 1,
      winnerName: "CPU",
    });

    expect(nextRoundState.winnerName).toBeNull();
    expect(nextRoundState.roundPauseFrames).toBe(0);
    expect(fighters[0].damagePercent).toBe(0);
    expect(fighters[0].state).toBe("idle");
  });

  it("resets all fighters using configured and fallback spawns", () => {
    const fighters = [
      ...createInitialFighters(),
      createTestFighter({ id: "p3", x: 1 }),
      createTestFighter({ id: "p4", x: 2 }),
      createTestFighter({ id: "p5", x: 3 }),
    ];

    resetRound(fighters);

    expect(fighters[0].x).toBe(360);
    expect(fighters[1].x).toBe(600);
    expect(fighters[2].x).toBe(260);
    expect(fighters[3].x).toBe(700);
    expect(fighters[4].x).toBeGreaterThan(40);
    expect(fighters[4].x).toBeLessThan(920);
  });
});
