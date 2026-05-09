import type { Fighter } from "./types";

export function getOpponents(fighter: Fighter, fighters: Fighter[]): Fighter[] {
  return fighters.filter((candidate) => candidate.id !== fighter.id);
}

export function getNearestOpponent(_fighter: Fighter, opponents: Fighter[]): Fighter | null {
  let nearest: Fighter | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const opponent of opponents) {
    if (opponent.state === "ko") {
      continue;
    }

    const distance = Math.abs(opponent.x - _fighter.x);

    if (distance < nearestDistance) {
      nearest = opponent;
      nearestDistance = distance;
    }
  }

  return nearest;
}
