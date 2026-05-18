import { movementConfig, shieldConfig } from "../config";
import { moveDefinitions, type MoveDefinition } from "../moves";
import type { CharacterDefinition } from "../characterTypes";

function tuneMove(move: MoveDefinition, overrides: Partial<MoveDefinition>): MoveDefinition {
  return {
    ...move,
    ...overrides,
    knockback: overrides.knockback ?? move.knockback,
    hitbox: overrides.hitbox ?? move.hitbox,
    hitboxes: overrides.hitboxes ?? move.hitboxes,
  };
}

export const marthMoves: Record<string, MoveDefinition> = {
  ...moveDefinitions,
  jab: tuneMove(moveDefinitions.jab, {
    startupFrames: 5,
    damage: 5,
    knockback: { base: 240, growth: 4, damageFactor: 7, angleDeg: 16 },
    hitbox: { x: 24, y: -80, width: 56, height: 20 },
  }),
  forwardTilt: tuneMove(moveDefinitions.forwardTilt, {
    startupFrames: 7,
    damage: 8,
    knockback: { base: 300, growth: 7, damageFactor: 7, angleDeg: 18 },
    hitbox: { x: 30, y: -78, width: 72, height: 22 },
    hitboxes: [
      {
        id: "sweetspot",
        x: 82,
        y: -78,
        width: 20,
        height: 22,
        damage: 11,
        knockback: { base: 360, growth: 9, damageFactor: 8, angleDeg: 18 },
        shieldDamage: 18,
        hitstopFrames: 6,
      },
      { id: "sourspot", x: 30, y: -78, width: 52, height: 22 },
    ],
  }),
  upTilt: tuneMove(moveDefinitions.upTilt, {
    startupFrames: 6,
    damage: 8,
    knockback: { base: 360, growth: 7, damageFactor: 7, angleDeg: 80 },
    hitbox: { x: -16, y: -130, width: 72, height: 56 },
  }),
  downTilt: tuneMove(moveDefinitions.downTilt, {
    startupFrames: 7,
    damage: 7,
    knockback: { base: 250, growth: 5, damageFactor: 7, angleDeg: 18 },
    hitbox: { x: 26, y: -38, width: 76, height: 24 },
  }),
  forwardSmash: tuneMove(moveDefinitions.forwardSmash, {
    startupFrames: 16,
    damage: 16,
    knockback: { base: 610, growth: 12, damageFactor: 8, angleDeg: 18 },
    hitbox: { x: 34, y: -70, width: 86, height: 28 },
    hitboxes: [
      {
        id: "sweetspot",
        x: 94,
        y: -70,
        width: 26,
        height: 28,
        damage: 20,
        knockback: { base: 720, growth: 14, damageFactor: 9, angleDeg: 18 },
        shieldDamage: 30,
        hitstopFrames: 10,
      },
      { id: "sourspot", x: 34, y: -70, width: 60, height: 28 },
    ],
  }),
  upSmash: tuneMove(moveDefinitions.upSmash, {
    startupFrames: 15,
    damage: 15,
    knockback: { base: 650, growth: 11, damageFactor: 8, angleDeg: 84 },
    hitbox: { x: -20, y: -142, width: 76, height: 64 },
  }),
  neutralSpecial: tuneMove(moveDefinitions.neutralSpecial, {
    startupFrames: 18,
    recoveryFrames: 28,
    damage: 14,
    knockback: { base: 500, growth: 10, damageFactor: 8, angleDeg: 16 },
    hitbox: { x: 34, y: -72, width: 82, height: 28 },
    shieldDamage: 28,
    hitstopFrames: 8,
    groundedMovementMultiplier: 0.2,
  }),
  sideSpecial: tuneMove(moveDefinitions.sideSpecial, {
    startupFrames: 8,
    damage: 8,
    knockback: { base: 280, growth: 6, damageFactor: 7, angleDeg: 22 },
    hitbox: { x: 28, y: -72, width: 74, height: 28 },
  }),
  neutralAir: tuneMove(moveDefinitions.neutralAir, {
    startupFrames: 6,
    damage: 7,
    knockback: { base: 250, growth: 5, damageFactor: 7, angleDeg: 20 },
    hitbox: { x: -26, y: -80, width: 78, height: 34 },
  }),
  forwardAir: tuneMove(moveDefinitions.forwardAir, {
    startupFrames: 5,
    recoveryFrames: 13,
    damage: 8,
    knockback: { base: 250, growth: 5, damageFactor: 7, angleDeg: 62 },
    hitbox: { x: 28, y: -82, width: 86, height: 34 },
    hitboxes: [
      {
        id: "sweetspot",
        x: 92,
        y: -82,
        width: 22,
        height: 34,
        damage: 10,
        knockback: { base: 320, growth: 7, damageFactor: 8, angleDeg: 62 },
        shieldDamage: 16,
        hitstopFrames: 6,
      },
      { id: "sourspot", x: 28, y: -82, width: 64, height: 34 },
    ],
  }),
  backAir: tuneMove(moveDefinitions.backAir, {
    startupFrames: 7,
    damage: 9,
    knockback: { base: 330, growth: 8, damageFactor: 7, angleDeg: 24 },
    hitbox: { x: -96, y: -78, width: 74, height: 28 },
    hitboxes: [
      {
        id: "sweetspot",
        x: -96,
        y: -78,
        width: 22,
        height: 28,
        damage: 12,
        knockback: { base: 400, growth: 10, damageFactor: 8, angleDeg: 24 },
        shieldDamage: 20,
        hitstopFrames: 7,
      },
      { id: "sourspot", x: -74, y: -78, width: 52, height: 28 },
    ],
  }),
  upAir: tuneMove(moveDefinitions.upAir, {
    startupFrames: 6,
    damage: 8,
    knockback: { base: 320, growth: 7, damageFactor: 7, angleDeg: 84 },
    hitbox: { x: -18, y: -132, width: 78, height: 52 },
  }),
  downAir: tuneMove(moveDefinitions.downAir, {
    startupFrames: 8,
    recoveryFrames: 22,
    damage: 13,
    knockback: { base: 430, growth: 10, damageFactor: 8, angleDeg: -82 },
    hitbox: { x: -8, y: -42, width: 76, height: 48 },
    hitstopFrames: 7,
  }),
  airSideSpecial: tuneMove(moveDefinitions.airSideSpecial, {
    startupFrames: 8,
    damage: 8,
    knockback: { base: 280, growth: 6, damageFactor: 7, angleDeg: 22 },
    hitbox: { x: 28, y: -72, width: 74, height: 28 },
  }),
};

export const marthCharacter: CharacterDefinition = {
  id: "marth",
  name: "Marth",
  size: { width: 52, height: 84 },
  maxShield: 100,
  movement: {
    ...movementConfig,
    groundAcceleration: 2500,
    airAcceleration: 1380,
    maxGroundSpeed: 278,
    maxAirSpeed: 238,
    initialDashSpeed: 241,
  },
  shield: {
    ...shieldConfig,
    box: {
      ...shieldConfig.box,
      width: 100,
      height: 126,
    },
  },
  moves: marthMoves,
  cooldowns: {
    sideSpecial: 18,
    upSpecial: 22,
    airSideSpecial: 18,
    airUpSpecial: 22,
    airDownSpecial: 24,
  },
};
