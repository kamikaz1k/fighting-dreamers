import { FLOOR_Y } from "./config";
import { getCharacter } from "./characters";
import type { Fighter } from "./types";

export function createTestFighter(overrides: Partial<Fighter> = {}): Fighter {
  const characterId = overrides.characterId ?? "dreamer";
  const character = getCharacter(characterId);

  return {
    id: "fighter",
    characterId,
    name: "Fighter",
    state: "idle",
    x: 400,
    y: FLOOR_Y,
    width: character.size.width,
    height: character.size.height,
    color: "#ffffff",
    facing: 1,
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    airJumpsRemaining: character.movement.maxAirJumps,
    jumpHoldFrames: 0,
    jumpCutApplied: false,
    fastFalling: false,
    ledgeSide: null,
    upSpecialAvailable: true,
    damagePercent: 0,
    shield: character.maxShield,
    maxShield: character.maxShield,
    currentMoveId: null,
    moveCooldowns: new Map(),
    moveFrame: 0,
    hitFighterIdsThisMove: new Set(),
    hitstopFrames: 0,
    hitstunFrames: 0,
    landingJumpCooldownFrames: 0,
    bufferedAction: null,
    ...overrides,
  };
}
