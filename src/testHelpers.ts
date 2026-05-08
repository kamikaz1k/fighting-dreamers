import { FLOOR_Y } from "./config";
import type { Fighter } from "./types";

export function createTestFighter(overrides: Partial<Fighter> = {}): Fighter {
  return {
    id: "fighter",
    name: "Fighter",
    state: "idle",
    x: 400,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: "#ffffff",
    facing: 1,
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    health: 100,
    maxHealth: 100,
    shield: 100,
    maxShield: 100,
    currentMoveId: null,
    moveFrame: 0,
    hitFighterIdsThisMove: new Set(),
    hitstopFrames: 0,
    hitstunFrames: 0,
    landingJumpCooldownFrames: 0,
    bufferedAction: null,
    ...overrides,
  };
}
