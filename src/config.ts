import type { StagePlatform } from "./types";

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const VIEW_MARGIN_X = 120;
export const VIEW_MARGIN_Y = 80;
export const VIEW_WIDTH = WORLD_WIDTH + VIEW_MARGIN_X * 2;
export const VIEW_HEIGHT = WORLD_HEIGHT + VIEW_MARGIN_Y * 2;
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
  jumpVelocity: -789,
  shortHopReleaseFrames: 6,
  shortHopVelocity: -420,
  maxFallSpeed: 760,
  fastFallSpeed: 980,
  fastFallGravityMultiplier: 1.55,
  crouchHeightMultiplier: 0.62,
  landingJumpCooldownFrames: 5,
  maxAirJumps: 1,
};

export const inputConfig = {
  bufferFrames: 6,
  smashDirectionWindowFrames: 4,
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

export const knockbackConfig = {
  damageScalePerPercent: 0.01,
};

export const roundConfig = {
  koPauseFrames: 90,
};

export const blastZoneConfig = {
  left: -140,
  right: WORLD_WIDTH + 140,
  top: -180,
  bottom: WORLD_HEIGHT + 180,
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
  { id: "leftPlatform", x: 90, y: 306, width: 210, height: 12 },
  { id: "topPlatform", x: 375, y: 204, width: 210, height: 12 },
  { id: "rightPlatform", x: 660, y: 306, width: 210, height: 12 },
] satisfies StagePlatform[];

export const mainPlatform = {
  id: "mainPlatform",
  x: STAGE_LEFT,
  y: FLOOR_Y,
  width: STAGE_RIGHT - STAGE_LEFT,
  height: 24,
} satisfies StagePlatform;

export const ledgeConfig = {
  grabWidth: 42,
  grabHeight: 92,
  hangInset: 12,
  climbInset: 18,
};
