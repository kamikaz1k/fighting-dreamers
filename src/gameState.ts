import {
  FLOOR_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
  WORLD_WIDTH,
  blastZoneConfig,
  roundConfig,
  spawnPoints,
} from "./config";
import { getCharacter } from "./characters";
import type { Fighter } from "./types";

export type RoundState = {
  roundPauseFrames: number;
  winnerName: string | null;
};

export function createInitialFighters(): Fighter[] {
  return [
    createFighter({
      id: "p1",
      characterId: "dreamer",
      name: "Player 1",
      x: 360,
      color: "#38bdf8",
      facing: 1,
    }),
    createFighter({
      id: "cpu",
      characterId: "striker",
      name: "CPU",
      x: 600,
      color: "#fb7185",
      facing: -1,
    }),
  ];
}

export function createFighter(config: {
  id: string;
  characterId: string;
  name: string;
  x: number;
  color: string;
  facing: -1 | 1;
}): Fighter {
  const character = getCharacter(config.characterId);

  return {
    id: config.id,
    characterId: config.characterId,
    name: config.name,
    state: "idle",
    x: config.x,
    y: FLOOR_Y,
    width: character.size.width,
    height: character.size.height,
    color: config.color,
    facing: config.facing,
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    airJumpsRemaining: character.movement.maxAirJumps,
    jumpHoldFrames: 0,
    jumpCutApplied: false,
    fastFalling: false,
    ledgeSide: null,
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
  };
}

export function updateRoundFlow(fighters: Fighter[], roundState: RoundState): RoundState {
  if (roundState.roundPauseFrames > 0) {
    const roundPauseFrames = roundState.roundPauseFrames - 1;

    if (roundPauseFrames === 0) {
      resetRound(fighters);
      return { roundPauseFrames: 0, winnerName: null };
    }

    return { ...roundState, roundPauseFrames };
  }

  const activeFighters = fighters.filter((fighter) => !isFighterKo(fighter));

  if (activeFighters.length > 1) {
    return roundState;
  }

  for (const fighter of fighters) {
    if (isFighterKo(fighter)) {
      fighter.state = "ko";
      fighter.velocityX = 0;
      fighter.velocityY = 0;
    }
  }

  return {
    winnerName: activeFighters[0]?.name ?? null,
    roundPauseFrames: roundConfig.koPauseFrames,
  };
}

export function isOutsideBlastZone(fighter: Fighter): boolean {
  return fighter.x < blastZoneConfig.left
    || fighter.x > blastZoneConfig.right
    || fighter.y - fighter.height < blastZoneConfig.top
    || fighter.y > blastZoneConfig.bottom;
}

function isFighterKo(fighter: Fighter): boolean {
  return isOutsideBlastZone(fighter);
}

export function resetRound(fighters: Fighter[]): void {
  fighters.forEach((fighter, index) => {
    const spawnPoint = spawnPoints[index] ?? getFallbackSpawnPoint(index, fighters.length);
    resetFighter(fighter, spawnPoint.x, spawnPoint.facing);
  });
}

export function getFallbackSpawnPoint(index: number, fighterCount: number): { x: number; facing: -1 | 1 } {
  const usableWidth = STAGE_RIGHT - STAGE_LEFT;
  const spacing = usableWidth / (fighterCount + 1);
  const x = STAGE_LEFT + spacing * (index + 1);

  return {
    x,
    facing: x < WORLD_WIDTH / 2 ? 1 : -1,
  };
}

export function resetFighter(fighter: Fighter, x: number, facing: -1 | 1): void {
  fighter.state = "idle";
  fighter.x = x;
  fighter.y = FLOOR_Y;
  fighter.facing = facing;
  fighter.velocityX = 0;
  fighter.velocityY = 0;
  fighter.grounded = true;
  fighter.airJumpsRemaining = getCharacter(fighter.characterId).movement.maxAirJumps;
  fighter.jumpHoldFrames = 0;
  fighter.jumpCutApplied = false;
  fighter.fastFalling = false;
  fighter.ledgeSide = null;
  fighter.damagePercent = 0;
  fighter.shield = fighter.maxShield;
  fighter.currentMoveId = null;
  fighter.moveFrame = 0;
  fighter.moveCooldowns.clear();
  fighter.hitFighterIdsThisMove.clear();
  fighter.hitstopFrames = 0;
  fighter.hitstunFrames = 0;
  fighter.landingJumpCooldownFrames = 0;
  fighter.bufferedAction = null;
}
