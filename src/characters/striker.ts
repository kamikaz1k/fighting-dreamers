import { movementConfig, shieldConfig } from "../config";
import { moveDefinitions, type MoveDefinition } from "../moves";
import type { CharacterDefinition } from "../characterTypes";

function tuneMove(move: MoveDefinition, overrides: Partial<MoveDefinition>): MoveDefinition {
  return {
    ...move,
    ...overrides,
    knockback: overrides.knockback ?? move.knockback,
    hitbox: overrides.hitbox ?? move.hitbox,
  };
}

export const strikerMoves: Record<string, MoveDefinition> = {
  ...moveDefinitions,
  forwardTilt: tuneMove(moveDefinitions.forwardTilt, {
    startupFrames: 6,
    damage: 7,
    knockback: { x: 430, y: -60 },
    hitbox: { x: 30, y: -76, width: 56, height: 22 },
  }),
  sideSpecial: tuneMove(moveDefinitions.sideSpecial, {
    startupFrames: 12,
    recoveryFrames: 24,
    damage: 13,
    knockback: { x: 660, y: -120 },
    hitbox: { x: 34, y: -64, width: 76, height: 30 },
  }),
  upSpecial: tuneMove(moveDefinitions.upSpecial, {
    startupFrames: 12,
    recoveryFrames: 25,
    damage: 12,
    knockback: { x: 110, y: -690 },
  }),
  airSideSpecial: tuneMove(moveDefinitions.airSideSpecial, {
    startupFrames: 12,
    recoveryFrames: 27,
    damage: 12,
    knockback: { x: 610, y: -130 },
    hitbox: { x: 32, y: -66, width: 76, height: 34 },
  }),
};

export const strikerCharacter: CharacterDefinition = {
  id: "striker",
  name: "Striker",
  size: { width: 58, height: 86 },
  maxShield: 90,
  movement: {
    ...movementConfig,
    groundAcceleration: 2400,
    maxGroundSpeed: 265,
    airAcceleration: 1320,
    maxAirSpeed: 230,
  },
  shield: {
    ...shieldConfig,
    holdDrainPerSecond: 14,
    regenPerSecond: 17,
    box: {
      ...shieldConfig.box,
      width: 104,
      height: 128,
    },
  },
  moves: strikerMoves,
  cooldowns: {
    sideSpecial: 26,
    upSpecial: 28,
    airSideSpecial: 26,
    airUpSpecial: 24,
    airDownSpecial: 28,
  },
};
