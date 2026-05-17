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
    hitWindows: overrides.hitWindows ?? move.hitWindows,
  };
}

export const captainFalconMoves: Record<string, MoveDefinition> = {
  ...moveDefinitions,
  jab: tuneMove(moveDefinitions.jab, {
    startupFrames: 4,
    damage: 5,
    knockback: { base: 250, growth: 4, damageFactor: 7, angleDeg: 12 },
    hitbox: { x: 22, y: -78, width: 34, height: 22 },
  }),
  forwardTilt: tuneMove(moveDefinitions.forwardTilt, {
    startupFrames: 8,
    damage: 9,
    knockback: { base: 340, growth: 7, damageFactor: 8, angleDeg: 14 },
    hitbox: { x: 24, y: -76, width: 44, height: 24 },
  }),
  forwardSmash: tuneMove(moveDefinitions.forwardSmash, {
    startupFrames: 18,
    damage: 18,
    knockback: { base: 720, growth: 13, damageFactor: 9, angleDeg: 18 },
    hitbox: { x: 26, y: -68, width: 62, height: 32 },
  }),
  neutralSpecial: tuneMove(moveDefinitions.neutralSpecial, {
    startupFrames: 26,
    activeFrames: 6,
    recoveryFrames: 34,
    damage: 22,
    knockback: { base: 760, growth: 14, damageFactor: 10, angleDeg: 20 },
    hitbox: { x: 18, y: -72, width: 64, height: 42 },
    shieldDamage: 32,
    hitstopFrames: 10,
    groundedMovementMultiplier: 0.1,
  }),
  sideSpecial: tuneMove(moveDefinitions.sideSpecial, {
    startupFrames: 11,
    damage: 11,
    knockback: { base: 420, growth: 8, damageFactor: 8, angleDeg: 68 },
    hitbox: { x: 28, y: -70, width: 58, height: 34 },
  }),
  neutralAir: tuneMove(moveDefinitions.neutralAir, {
    startupFrames: 5,
    activeFrames: 11,
    recoveryFrames: 16,
    damage: 5,
    knockback: { base: 220, growth: 4, damageFactor: 7, angleDeg: 18 },
    hitbox: { x: -20, y: -76, width: 42, height: 32 },
    hitWindows: [
      {
        id: "kick1",
        startFrame: 5,
        endFrame: 8,
        hitboxes: [
          {
            id: "kick1",
            x: 18,
            y: -78,
            width: 36,
            height: 24,
            damage: 4,
            knockback: { base: 180, growth: 3, damageFactor: 6, angleDeg: 24 },
            shieldDamage: 8,
            hitstopFrames: 3,
          },
        ],
      },
      {
        id: "kick2",
        startFrame: 12,
        endFrame: 16,
        hitboxes: [
          {
            id: "kick2",
            x: 20,
            y: -72,
            width: 42,
            height: 28,
            damage: 6,
            knockback: { base: 260, growth: 6, damageFactor: 7, angleDeg: 18 },
            shieldDamage: 12,
            hitstopFrames: 5,
          },
        ],
      },
    ],
  }),
  forwardAir: tuneMove(moveDefinitions.forwardAir, {
    startupFrames: 12,
    activeFrames: 3,
    recoveryFrames: 22,
    damage: 18,
    knockback: { base: 520, growth: 13, damageFactor: 9, angleDeg: 32 },
    hitbox: { x: 24, y: -72, width: 40, height: 28 },
    shieldDamage: 22,
    hitstopFrames: 8,
    airControlMultiplier: 0.54,
  }),
  upAir: tuneMove(moveDefinitions.upAir, {
    startupFrames: 5,
    damage: 7,
    knockback: { base: 320, growth: 7, damageFactor: 7, angleDeg: 72 },
    hitbox: { x: -18, y: -124, width: 48, height: 44 },
  }),
  downAir: tuneMove(moveDefinitions.downAir, {
    startupFrames: 10,
    recoveryFrames: 21,
    damage: 14,
    knockback: { base: 430, growth: 10, damageFactor: 8, angleDeg: -76 },
    hitbox: { x: -2, y: -36, width: 44, height: 46 },
    hitstopFrames: 7,
  }),
  airNeutralSpecial: tuneMove(moveDefinitions.airNeutralSpecial, {
    startupFrames: 26,
    activeFrames: 6,
    recoveryFrames: 34,
    damage: 22,
    knockback: { base: 760, growth: 14, damageFactor: 10, angleDeg: 20 },
    hitbox: { x: -28, y: -76, width: 62, height: 42 },
    shieldDamage: 32,
    hitstopFrames: 10,
    airControlMultiplier: 0.18,
  }),
};

export const captainFalconCharacter: CharacterDefinition = {
  id: "captainFalcon",
  name: "Captain Falcon",
  size: { width: 54, height: 86 },
  maxShield: 95,
  movement: {
    ...movementConfig,
    groundAcceleration: 3300,
    airAcceleration: 1650,
    maxGroundSpeed: 360,
    maxAirSpeed: 275,
    gravity: 2050,
    maxFallSpeed: 820,
    fastFallSpeed: 1080,
  },
  shield: shieldConfig,
  moves: captainFalconMoves,
  cooldowns: {
    sideSpecial: 22,
    upSpecial: 20,
    airSideSpecial: 22,
    airUpSpecial: 20,
    airDownSpecial: 24,
  },
};
