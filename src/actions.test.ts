import { describe, expect, it } from "vitest";
import { inputConfig } from "./config";
import {
  getMoveCooldown,
  startAttack,
  updateActions,
  updateAttack,
  updateInputBuffer,
  updateMoveCooldowns,
  updateShield,
} from "./actions";
import { moveDefinitions } from "./moves";
import { createTestFighter } from "./testHelpers";
import type { FighterCommand } from "./types";

const idleCommand: FighterCommand = {
  moveX: 0,
  moveXPressed: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false,
  attackPressed: false,
  smashPressed: false,
  specialPressed: false,
  shieldHeld: false,
};

describe("actions", () => {
  it("buffers weak and strong attacks with directional context", () => {
    const fighter = createTestFighter({ facing: 1, grounded: true });

    updateInputBuffer(fighter, { ...idleCommand, moveX: 1, attackPressed: true });

    expect(fighter.bufferedAction).toEqual({
      button: "attack",
      direction: "forward",
      moveX: 1,
      smash: false,
      grounded: true,
      framesRemaining: inputConfig.bufferFrames,
    });
  });

  it("buffers grounded smash attacks separately from tilts", () => {
    const fighter = createTestFighter({ facing: 1, grounded: true });

    updateInputBuffer(fighter, {
      ...idleCommand,
      moveX: 1,
      attackPressed: true,
      smashPressed: true,
    });

    expect(fighter.bufferedAction?.smash).toBe(true);
  });

  it("starts a buffered attack when actionable", () => {
    const fighter = createTestFighter({
      bufferedAction: {
        button: "special",
        direction: "up",
        moveX: 0,
        smash: false,
        grounded: true,
        framesRemaining: 4,
      },
    });

    updateActions(fighter, idleCommand);

    expect(fighter.state).toBe("attack");
    expect(fighter.currentMoveId).toBe("upSpecial");
    expect(fighter.bufferedAction).toBeNull();
  });

  it("sets and ticks character move cooldowns", () => {
    const fighter = createTestFighter({ characterId: "captainFalcon" });
    const move = moveDefinitions.upSpecial;

    startAttack(fighter, move);

    expect(fighter.moveCooldowns.get(move.id)).toBe(20);

    updateMoveCooldowns(fighter);

    expect(fighter.moveCooldowns.get(move.id)).toBe(19);
  });

  it("uses character-specific cooldowns", () => {
    const fighter = createTestFighter({ characterId: "marth" });
    const move = moveDefinitions.upSpecial;

    startAttack(fighter, move);

    expect(fighter.moveCooldowns.get(move.id)).toBe(22);
  });

  it("shares cooldown between grounded and aerial up special", () => {
    const fighter = createTestFighter({ characterId: "captainFalcon" });

    startAttack(fighter, moveDefinitions.upSpecial);

    expect(getMoveCooldown(fighter, moveDefinitions.airUpSpecial)).toBe(20);
  });

  it("does not allow another up special until landing", () => {
    const fighter = createTestFighter({
      grounded: false,
      upSpecialAvailable: false,
      bufferedAction: {
        button: "special",
        direction: "up",
        moveX: 0,
        smash: false,
        grounded: false,
        framesRemaining: 4,
      },
    });

    updateActions(fighter, idleCommand);

    expect(fighter.currentMoveId).toBeNull();
    expect(fighter.state).toBe("idle");
  });

  it("launches the fighter when starting up special", () => {
    const fighter = createTestFighter();

    startAttack(fighter, moveDefinitions.upSpecial);

    expect(fighter.grounded).toBe(false);
    expect(fighter.upSpecialAvailable).toBe(false);
    expect(fighter.velocityY).toBe(moveDefinitions.upSpecial.selfVelocity?.y);
  });

  it("aims up special from buffered horizontal input", () => {
    const fighter = createTestFighter({ facing: 1 });

    startAttack(fighter, moveDefinitions.upSpecial, {
      button: "special",
      direction: "up",
      moveX: -1,
      smash: false,
      grounded: false,
      framesRemaining: 4,
    });

    expect(fighter.facing).toBe(-1);
    expect(fighter.velocityX).toBe(-(moveDefinitions.upSpecial.selfVelocity?.x ?? 0));
  });

  it("does not consume buffered action while matching move is cooling down", () => {
    const fighter = createTestFighter({
      bufferedAction: {
        button: "special",
        direction: "up",
        moveX: 0,
        smash: false,
        grounded: true,
        framesRemaining: 4,
      },
    });
    fighter.moveCooldowns.set("upSpecial", 5);

    updateActions(fighter, idleCommand);

    expect(fighter.state).toBe("idle");
    expect(fighter.currentMoveId).toBeNull();
    expect(fighter.bufferedAction?.direction).toBe("up");
  });

  it("advances and ends attack recovery", () => {
    const fighter = createTestFighter();
    const move = moveDefinitions.jab;

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
    expect(fighter.shield).toBeGreaterThan(49);
  });

  it("only allows shield on the ground", () => {
    const fighter = createTestFighter({
      grounded: false,
      state: "fall",
      shield: 50,
    });

    updateShield(fighter, { ...idleCommand, shieldHeld: true });

    expect(fighter.state).toBe("fall");
    expect(fighter.shield).toBeGreaterThan(50);
  });

  it("uses character-specific shield config", () => {
    const captainFalcon = createTestFighter({ characterId: "captainFalcon", shield: 50 });
    const marth = createTestFighter({ characterId: "marth", shield: 50 });

    updateShield(captainFalcon, { ...idleCommand, shieldHeld: true });
    updateShield(marth, { ...idleCommand, shieldHeld: true });

    expect(marth.shield).toBe(captainFalcon.shield);
  });
});
