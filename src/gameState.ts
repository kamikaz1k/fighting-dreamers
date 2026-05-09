import {
  FLOOR_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
  WORLD_WIDTH,
  roundConfig,
  spawnPoints,
} from "./config";
import type { Fighter } from "./types";

export type RoundState = {
  roundPauseFrames: number;
  winnerName: string | null;
};

export function createInitialFighters(): Fighter[] {
  return [
    createFighter({
      id: "p1",
      name: "Player 1",
      x: 360,
      color: "#38bdf8",
      facing: 1,
    }),
    createFighter({
      id: "cpu",
      name: "CPU",
      x: 600,
      color: "#fb7185",
      facing: -1,
    }),
  ];
}

export function createFighter(config: {
  id: string;
  name: string;
  x: number;
  color: string;
  facing: -1 | 1;
}): Fighter {
  return {
    id: config.id,
    name: config.name,
    state: "idle",
    x: config.x,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: config.color,
    facing: config.facing,
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

  const activeFighters = fighters.filter((fighter) => fighter.health > 0);

  if (activeFighters.length > 1) {
    return roundState;
  }

  for (const fighter of fighters) {
    if (fighter.health <= 0) {
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
  fighter.health = fighter.maxHealth;
  fighter.shield = fighter.maxShield;
  fighter.currentMoveId = null;
  fighter.moveFrame = 0;
  fighter.hitFighterIdsThisMove.clear();
  fighter.hitstopFrames = 0;
  fighter.hitstunFrames = 0;
  fighter.landingJumpCooldownFrames = 0;
  fighter.bufferedAction = null;
}
