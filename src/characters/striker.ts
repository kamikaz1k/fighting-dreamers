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
  groundForwardWeak: tuneMove(moveDefinitions.groundForwardWeak, {
    startupFrames: 6,
    damage: 7,
    knockback: { x: 430, y: -60 },
    hitbox: { x: 30, y: -76, width: 56, height: 22 },
  }),
  groundForwardStrong: tuneMove(moveDefinitions.groundForwardStrong, {
    startupFrames: 12,
    recoveryFrames: 24,
    damage: 13,
    knockback: { x: 660, y: -120 },
    hitbox: { x: 34, y: -64, width: 76, height: 30 },
  }),
  groundUpStrong: tuneMove(moveDefinitions.groundUpStrong, {
    startupFrames: 12,
    recoveryFrames: 25,
    damage: 12,
    knockback: { x: 110, y: -690 },
  }),
  airForwardStrong: tuneMove(moveDefinitions.airForwardStrong, {
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
  size: { width: 58, height: 108 },
  maxHealth: 110,
  maxShield: 90,
  movement: {
    ...movementConfig,
    groundAcceleration: 2400,
    maxGroundSpeed: 265,
    airAcceleration: 1320,
    maxAirSpeed: 230,
  },
  shield: shieldConfig,
  moves: strikerMoves,
  cooldowns: {
    groundForwardStrong: 26,
    groundBackStrong: 22,
    groundUpStrong: 28,
    airForwardStrong: 26,
    airBackStrong: 22,
    airUpStrong: 24,
    airDownStrong: 28,
  },
};
