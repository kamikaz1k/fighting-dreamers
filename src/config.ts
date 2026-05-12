import type { StagePlatform } from "./types";

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const FLOOR_Y = 450;
export const STAGE_LEFT = 40;
export const STAGE_RIGHT = 920;
export const FIXED_TIMESTEP_SECONDS = 1 / 60;
export const MAX_ACCUMULATED_SECONDS = 0.25;

export const movementConfig = {
  groundAcceleration: 2600,
  airAcceleration: 1450,
  maxGroundSpeed: 285,
  maxAirSpeed: 245,
  groundFriction: 2100,
  gravity: 1850,
  jumpVelocity: -720,
  landingJumpCooldownFrames: 5,
  maxAirJumps: 1,
};

export const inputConfig = {
  bufferFrames: 6,
};

export const shieldConfig = {
  holdDrainPerSecond: 12,
  regenPerSecond: 20,
  minToActivate: 10,
  box: {
    width: 92,
    height: 122,
    offsetX: 0,
    offsetY: -62,
  },
};

export const roundConfig = {
  koPauseFrames: 90,
};

export const debugConfig = {
  enabled: import.meta.env.DEV,
};

export const spawnPoints = [
  { x: 360, facing: 1 },
  { x: 600, facing: -1 },
  { x: 260, facing: 1 },
  { x: 700, facing: -1 },
] satisfies Array<{ x: number; facing: -1 | 1 }>;

export const stagePlatforms = [
  { id: "leftPlatform", x: 210, y: 306, width: 210, height: 12 },
  { id: "topPlatform", x: 375, y: 204, width: 210, height: 12 },
  { id: "rightPlatform", x: 540, y: 306, width: 210, height: 12 },
] satisfies StagePlatform[];
