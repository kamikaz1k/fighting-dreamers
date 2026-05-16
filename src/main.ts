import "./styles.css";
import { updateActions, updateHitstop, updateHitstun } from "./actions";
import { resolveAttackCollision } from "./combat";
import {
  FIXED_TIMESTEP_SECONDS,
  MAX_ACCUMULATED_SECONDS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  debugConfig,
} from "./config";
import { CpuController, KeyboardController, idleCommand } from "./controllers";
import { getOpponents } from "./fighters";
import { createInitialFighters, updateRoundFlow } from "./gameState";
import { applyMovement, updateMovementState } from "./physics";
import { renderGame } from "./render";
import type { Controller, FighterCommand } from "./types";

const fighters = createInitialFighters();
const cpuController = new CpuController();
const controllersByFighterId = new Map<string, Controller>([
  ["p1", new KeyboardController()],
  ["cpu", cpuController],
]);
const latestCommandsByFighterId = new Map<string, FighterCommand>();

const canvas = document.createElement("canvas");
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

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
