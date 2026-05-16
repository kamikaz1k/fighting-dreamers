import type { MoveButton, MoveDirection } from "./moves";

export type FighterState = "idle" | "run" | "crouch" | "jump" | "fall" | "ledge" | "attack" | "shield" | "hitstun" | "ko";

export type BufferedAction = {
  button: MoveButton;
  direction: MoveDirection;
  grounded: boolean;
  framesRemaining: number;
};

export type Fighter = {
  id: string;
  characterId: string;
  name: string;
  state: FighterState;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  facing: -1 | 1;
  velocityX: number;
  velocityY: number;
  grounded: boolean;
  airJumpsRemaining: number;
  jumpHoldFrames: number;
  jumpCutApplied: boolean;
  fastFalling: boolean;
  ledgeSide: -1 | 1 | null;
  damagePercent: number;
  shield: number;
  maxShield: number;
  currentMoveId: string | null;
  moveCooldowns: Map<string, number>;
  moveFrame: number;
  hitFighterIdsThisMove: Set<string>;
  hitstopFrames: number;
  hitstunFrames: number;
  landingJumpCooldownFrames: number;
  bufferedAction: BufferedAction | null;
};

export type FighterCommand = {
  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
  weakPressed: boolean;
  strongPressed: boolean;
  shieldHeld: boolean;
};

export type ControllerContext = {
  self: Fighter;
  opponents: Fighter[];
  frame: number;
};

export interface Controller {
  update(context: ControllerContext): FighterCommand;
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StagePlatform = Rect & {
  id: string;
};
