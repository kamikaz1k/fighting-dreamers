import "./styles.css";
import {
  getCurrentMove,
  getMoveTotalFrames,
  resolveAttackCollision,
} from "./combat";
import {
  FIXED_TIMESTEP_SECONDS,
  MAX_ACCUMULATED_SECONDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  debugConfig,
  inputConfig,
  movementConfig,
  shieldConfig,
} from "./config";
import { CpuController, KeyboardController, idleCommand } from "./controllers";
import { getOpponents } from "./fighters";
import { createInitialFighters, updateRoundFlow } from "./gameState";
import { clamp, moveToward } from "./math";
import { getMoveDirection, getMoveForBufferedAction } from "./moveLookup";
import type { MoveDefinition } from "./moves";
import { applyMovement, updateMovementState } from "./physics";
import { renderGame } from "./render";
import type { Controller, Fighter, FighterCommand } from "./types";

const fighters = createInitialFighters();
const cpuController = new CpuController();
const controllersByFighterId = new Map<string, Controller>([
  ["p1", new KeyboardController()],
  ["cpu", cpuController],
]);
const latestCommandsByFighterId = new Map<string, FighterCommand>();

const canvas = document.createElement("canvas");
canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app mount point");
}

app.append(canvas);

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas 2D context is unavailable");
}

const ctx = context;
let previousTimeSeconds = performance.now() / 1000;
let accumulatedSeconds = 0;
let totalSimulatedSeconds = 0;
let simulationFrames = 0;
let roundPauseFrames = 0;
let winnerName: string | null = null;
let debugEnabled = debugConfig.enabled;

window.addEventListener("keydown", (event) => {
  if (event.code === "Backquote") {
    debugEnabled = !debugEnabled;
  }
});

function update(): void {
  for (const fighter of fighters) {
    const opponents = getOpponents(fighter, fighters);
    const controller = controllersByFighterId.get(fighter.id);
    latestCommandsByFighterId.set(fighter.id, controller?.update({
      self: fighter,
      opponents,
      frame: simulationFrames,
    }) ?? idleCommand);
  }

  for (const fighter of fighters) {
    if (updateHitstop(fighter)) {
      continue;
    }

    const command = latestCommandsByFighterId.get(fighter.id) ?? idleCommand;
    updateHitstun(fighter);
    updateActions(fighter, command);
    applyMovement(fighter, command);
    updateMovementState(fighter);
  }

  resolveAttackCollisions();
  ({ roundPauseFrames, winnerName } = updateRoundFlow(fighters, {
    roundPauseFrames,
    winnerName,
  }));
  totalSimulatedSeconds += FIXED_TIMESTEP_SECONDS;
  simulationFrames += 1;
}

function updateHitstop(fighter: Fighter): boolean {
  if (fighter.hitstopFrames <= 0) {
    return false;
  }

  fighter.hitstopFrames -= 1;
  return true;
}

function updateHitstun(fighter: Fighter): void {
  if (fighter.hitstunFrames <= 0) {
    return;
  }

  fighter.hitstunFrames -= 1;

  if (fighter.hitstunFrames === 0) {
    fighter.state = fighter.grounded ? "idle" : "fall";
  }
}

function updateActions(fighter: Fighter, command: FighterCommand): void {
  updateInputBuffer(fighter, command);

  if (fighter.state === "hitstun" || fighter.state === "ko") {
    return;
  }

  if (fighter.state === "attack") {
    updateAttack(fighter);
    return;
  }

  updateShield(fighter, command);

  if (fighter.state === "shield") {
    return;
  }

  const bufferedAction = fighter.bufferedAction;

  if (bufferedAction) {
    startAttack(fighter, getMoveForBufferedAction(bufferedAction));
    fighter.bufferedAction = null;
    return;
  }
}

function updateShield(fighter: Fighter, command: FighterCommand): void {
  if (command.shieldHeld && fighter.shield >= shieldConfig.minToActivate) {
    fighter.state = "shield";
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movementConfig.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
    fighter.shield = clamp(
      fighter.shield - shieldConfig.holdDrainPerSecond * FIXED_TIMESTEP_SECONDS,
      0,
      fighter.maxShield,
    );
    return;
  }

  if (fighter.state === "shield") {
    fighter.state = fighter.grounded ? "idle" : "fall";
  }

  fighter.shield = clamp(
    fighter.shield + shieldConfig.regenPerSecond * FIXED_TIMESTEP_SECONDS,
    0,
    fighter.maxShield,
  );
}

function updateInputBuffer(fighter: Fighter, command: FighterCommand): void {
  if (command.weakPressed || command.strongPressed) {
    fighter.bufferedAction = {
      button: command.weakPressed ? "weak" : "strong",
      direction: getMoveDirection(fighter, command),
      grounded: fighter.grounded,
      framesRemaining: inputConfig.bufferFrames,
    };
    return;
  }

  if (!fighter.bufferedAction) {
    return;
  }

  fighter.bufferedAction.framesRemaining -= 1;

  if (fighter.bufferedAction.framesRemaining <= 0) {
    fighter.bufferedAction = null;
  }
}

function startAttack(fighter: Fighter, move: MoveDefinition): void {
  fighter.state = "attack";
  fighter.currentMoveId = move.id;
  fighter.moveFrame = 0;
  fighter.hitFighterIdsThisMove.clear();
}

function updateAttack(fighter: Fighter): void {
  const move = getCurrentMove(fighter);

  if (!move) {
    fighter.state = "idle";
    fighter.currentMoveId = null;
    fighter.moveFrame = 0;
    return;
  }

  fighter.moveFrame += 1;

  if (fighter.moveFrame >= getMoveTotalFrames(move)) {
    fighter.state = fighter.grounded ? "idle" : "fall";
    fighter.currentMoveId = null;
    fighter.moveFrame = 0;
    fighter.hitFighterIdsThisMove.clear();
  }
}

function resolveAttackCollisions(): void {
  for (const attacker of fighters) {
    for (const defender of fighters) {
      if (attacker.id !== defender.id) {
        resolveAttackCollision(attacker, defender);
      }
    }
  }
}

function render(interpolationAlpha: number): void {
  renderGame(ctx, {
    fighters,
    latestCommandsByFighterId,
    cpuIntent: cpuController.intent,
    debugEnabled,
    interpolationAlpha,
    simulationFrames,
    totalSimulatedSeconds,
    winnerName,
  });
}

function frame(currentTimeMilliseconds: number): void {
  const currentTimeSeconds = currentTimeMilliseconds / 1000;
  const deltaSeconds = Math.min(
    currentTimeSeconds - previousTimeSeconds,
    MAX_ACCUMULATED_SECONDS,
  );
  previousTimeSeconds = currentTimeSeconds;
  accumulatedSeconds += deltaSeconds;

  while (accumulatedSeconds >= FIXED_TIMESTEP_SECONDS) {
    update();
    accumulatedSeconds -= FIXED_TIMESTEP_SECONDS;
  }

  render(accumulatedSeconds / FIXED_TIMESTEP_SECONDS);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
