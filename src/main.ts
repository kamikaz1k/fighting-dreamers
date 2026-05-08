import "./styles.css";
import {
  getCurrentMove,
  getMoveTotalFrames,
  isMoveActive,
  resolveAttackCollision,
} from "./combat";
import {
  FIXED_TIMESTEP_SECONDS,
  FLOOR_Y,
  MAX_ACCUMULATED_SECONDS,
  STAGE_LEFT,
  STAGE_RIGHT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  debugConfig,
  inputConfig,
  movementConfig,
  roundConfig,
  shieldConfig,
  spawnPoints,
} from "./config";
import { getHurtbox, getMoveHitbox, getShieldBox } from "./geometry";
import { getMoveDirection, getMoveForBufferedAction } from "./moveLookup";
import type { MoveDefinition } from "./moves";
import type { Controller, ControllerContext, Fighter, FighterCommand } from "./types";

const idleCommand: FighterCommand = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  weakPressed: false,
  strongPressed: false,
  shieldHeld: false,
};

type CpuIntent = "approach" | "retreat" | "attack" | "shield" | "recover";

class CpuController implements Controller {
  intent: CpuIntent = "approach";
  private reactionFramesRemaining = 0;
  private attackCooldownFrames = 30;
  private shieldFramesRemaining = 0;
  private cachedCommand: FighterCommand = idleCommand;

  update(context: ControllerContext): FighterCommand {
    this.attackCooldownFrames = Math.max(0, this.attackCooldownFrames - 1);
    this.reactionFramesRemaining -= 1;

    if (this.reactionFramesRemaining > 0) {
      return this.cachedCommand;
    }

    this.reactionFramesRemaining = 10 + (context.frame % 9);
    this.cachedCommand = this.chooseCommand(context);
    return this.cachedCommand;
  }

  private chooseCommand(context: ControllerContext): FighterCommand {
    const opponent = getNearestOpponent(context.self, context.opponents);

    if (!opponent) {
      this.intent = "recover";
      return idleCommand;
    }

    const distanceX = opponent.x - context.self.x;
    const absDistanceX = Math.abs(distanceX);
    const verticalDelta = opponent.y - context.self.y;
    const directionToOpponent = Math.sign(distanceX) as -1 | 0 | 1;

    if (context.self.state === "hitstun" || context.self.state === "ko") {
      this.intent = "recover";
      return idleCommand;
    }

    if (this.shieldFramesRemaining > 0) {
      this.intent = "shield";
      this.shieldFramesRemaining -= this.reactionFramesRemaining;
      return { ...idleCommand, shieldHeld: true };
    }

    if (opponent.state === "attack" && absDistanceX < 120 && context.self.shield > 20) {
      this.intent = "shield";
      this.shieldFramesRemaining = 18;
      return { ...idleCommand, shieldHeld: true };
    }

    if (absDistanceX < 58) {
      this.intent = "retreat";
      return { ...idleCommand, moveX: directionToOpponent === -1 ? 1 : -1 };
    }

    if (absDistanceX < 110 && this.attackCooldownFrames === 0) {
      this.intent = "attack";
      this.attackCooldownFrames = 42;

      if (verticalDelta < -24) {
        return { ...idleCommand, moveY: -1, weakPressed: true };
      }

      return { ...idleCommand, moveX: directionToOpponent, strongPressed: true };
    }

    this.intent = "approach";
    return { ...idleCommand, moveX: directionToOpponent };
  }
}

class KeyboardController implements Controller {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (!this.heldKeys.has(event.code)) {
        this.pressedKeys.add(event.code);
      }

      this.heldKeys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.heldKeys.delete(event.code);
    });
  }

  update(): FighterCommand {
    const command: FighterCommand = {
      moveX: this.readHorizontal(),
      moveY: this.readVertical(),
      jumpPressed: this.consumePressed("KeyW"),
      weakPressed: this.consumePressed("KeyJ"),
      strongPressed: this.consumePressed("KeyK"),
      shieldHeld: this.heldKeys.has("KeyL"),
    };

    this.pressedKeys.clear();
    return command;
  }

  private readHorizontal(): -1 | 0 | 1 {
    const left = this.heldKeys.has("KeyA");
    const right = this.heldKeys.has("KeyD");

    if (left === right) {
      return 0;
    }

    return left ? -1 : 1;
  }

  private readVertical(): -1 | 0 | 1 {
    const up = this.heldKeys.has("KeyW");
    const down = this.heldKeys.has("KeyS");

    if (up === down) {
      return 0;
    }

    return up ? -1 : 1;
  }

  private consumePressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }
}

const fighters: Fighter[] = [
  {
    id: "p1",
    name: "Player 1",
    state: "idle",
    x: 360,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: "#38bdf8",
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
  },
  {
    id: "cpu",
    name: "CPU",
    state: "idle",
    x: 600,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: "#fb7185",
    facing: -1,
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
  },
];

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
    const opponents = getOpponents(fighter);
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
  updateRoundFlow();
  totalSimulatedSeconds += FIXED_TIMESTEP_SECONDS;
  simulationFrames += 1;
}

function getOpponents(fighter: Fighter): Fighter[] {
  return fighters.filter((candidate) => candidate.id !== fighter.id);
}

function getNearestOpponent(fighter: Fighter, opponents: Fighter[]): Fighter | null {
  let nearest: Fighter | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const opponent of opponents) {
    if (opponent.state === "ko") {
      continue;
    }

    const distance = Math.abs(opponent.x - fighter.x);

    if (distance < nearestDistance) {
      nearest = opponent;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function updateRoundFlow(): void {
  if (roundPauseFrames > 0) {
    roundPauseFrames -= 1;

    if (roundPauseFrames === 0) {
      resetRound();
    }

    return;
  }

  const activeFighters = fighters.filter((fighter) => fighter.health > 0);

  if (activeFighters.length > 1) {
    return;
  }

  for (const fighter of fighters) {
    if (fighter.health <= 0) {
      fighter.state = "ko";
      fighter.velocityX = 0;
      fighter.velocityY = 0;
    }
  }

  winnerName = activeFighters[0]?.name ?? null;
  roundPauseFrames = roundConfig.koPauseFrames;
}

function resetRound(): void {
  fighters.forEach((fighter, index) => {
    const spawnPoint = spawnPoints[index] ?? getFallbackSpawnPoint(index);
    resetFighter(fighter, spawnPoint.x, spawnPoint.facing);
  });
  winnerName = null;
}

function getFallbackSpawnPoint(index: number): { x: number; facing: -1 | 1 } {
  const usableWidth = STAGE_RIGHT - STAGE_LEFT;
  const spacing = usableWidth / (fighters.length + 1);
  const x = STAGE_LEFT + spacing * (index + 1);

  return {
    x,
    facing: x < WORLD_WIDTH / 2 ? 1 : -1,
  };
}

function resetFighter(fighter: Fighter, x: number, facing: -1 | 1): void {
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

function updateMovementState(fighter: Fighter): void {
  if (
    fighter.state === "attack"
    || fighter.state === "shield"
    || fighter.state === "hitstun"
    || fighter.state === "ko"
  ) {
    return;
  }

  if (!fighter.grounded) {
    fighter.state = fighter.velocityY < 0 ? "jump" : "fall";
    return;
  }

  fighter.state = Math.abs(fighter.velocityX) > 5 ? "run" : "idle";
}

function applyMovement(fighter: Fighter, command: FighterCommand): void {
  const wasGrounded = fighter.grounded;
  const acceleration = fighter.grounded
    ? movementConfig.groundAcceleration
    : movementConfig.airAcceleration;
  const maxSpeed = fighter.grounded ? movementConfig.maxGroundSpeed : movementConfig.maxAirSpeed;

  if (command.moveX !== 0) {
    if (canChangeFacing(fighter)) {
      fighter.facing = command.moveX;
    }

    fighter.velocityX += command.moveX * acceleration * FIXED_TIMESTEP_SECONDS;
  } else if (fighter.grounded) {
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movementConfig.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
  }

  fighter.velocityX = clamp(fighter.velocityX, -maxSpeed, maxSpeed);

  if (fighter.state === "attack") {
    fighter.velocityX *= getCurrentMove(fighter)?.movementMultiplier ?? 1;
  }

  if (fighter.state === "shield") {
    fighter.velocityX = 0;
  }

  if (fighter.grounded && fighter.landingJumpCooldownFrames > 0) {
    fighter.landingJumpCooldownFrames -= 1;
  }

  if (shouldStartJump(fighter, command)) {
    startJump(fighter);
  }

  if (!fighter.grounded) {
    fighter.velocityY += movementConfig.gravity * FIXED_TIMESTEP_SECONDS;
  }

  fighter.x += fighter.velocityX * FIXED_TIMESTEP_SECONDS;
  fighter.y += fighter.velocityY * FIXED_TIMESTEP_SECONDS;

  const halfWidth = fighter.width / 2;
  const minX = STAGE_LEFT + halfWidth;
  const maxX = STAGE_RIGHT - halfWidth;

  if (fighter.x < minX) {
    fighter.x = minX;
    fighter.velocityX = Math.max(0, fighter.velocityX);
  } else if (fighter.x > maxX) {
    fighter.x = maxX;
    fighter.velocityX = Math.min(0, fighter.velocityX);
  }

  if (fighter.y >= FLOOR_Y) {
    fighter.y = FLOOR_Y;
    fighter.velocityY = 0;
    fighter.grounded = true;

    if (!wasGrounded) {
      fighter.landingJumpCooldownFrames = movementConfig.landingJumpCooldownFrames;
    }
  }
}

function canChangeFacing(fighter: Fighter): boolean {
  return fighter.state !== "attack"
    && fighter.state !== "hitstun"
    && fighter.state !== "ko";
}

function shouldStartJump(fighter: Fighter, command: FighterCommand): boolean {
  return fighter.grounded
    && fighter.landingJumpCooldownFrames === 0
    && fighter.state !== "hitstun"
    && fighter.state !== "shield"
    && (command.jumpPressed || command.moveY === -1);
}

function startJump(fighter: Fighter): void {
  fighter.velocityY = movementConfig.jumpVelocity;
  fighter.grounded = false;
}

function moveToward(value: number, target: number, amount: number): number {
  if (value < target) {
    return Math.min(value + amount, target);
  }

  if (value > target) {
    return Math.max(value - amount, target);
  }

  return target;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function render(interpolationAlpha: number): void {
  ctx.fillStyle = "#14181f";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  renderStage();
  renderFighters();
  renderHud(interpolationAlpha);
  renderRoundOverlay();
}

function renderStage(): void {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, FLOOR_Y, WORLD_WIDTH, WORLD_HEIGHT - FLOOR_Y);

  ctx.fillStyle = "#252c38";
  ctx.fillRect(0, FLOOR_Y, WORLD_WIDTH, 8);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, FLOOR_Y + 1);
  ctx.lineTo(WORLD_WIDTH - 40, FLOOR_Y + 1);
  ctx.stroke();
}

function renderFighters(): void {
  for (const fighter of fighters) {
    const hurtbox = getHurtbox(fighter);

    if (fighter.state === "shield") {
      renderShield(fighter);
    }

    ctx.fillStyle = fighter.color;
    ctx.fillRect(hurtbox.x, hurtbox.y, hurtbox.width, hurtbox.height);

    if (debugEnabled) {
      ctx.strokeStyle = "#e0f2fe";
      ctx.strokeRect(hurtbox.x, hurtbox.y, hurtbox.width, hurtbox.height);
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(fighter.x + fighter.facing * 8 - 3, hurtbox.y + 20, 6, 6);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fighter.name, fighter.x, hurtbox.y - 12);

    const move = getCurrentMove(fighter);

    if (move && debugEnabled) {
      const hitbox = getMoveHitbox(fighter, move);
      const active = isMoveActive(fighter, move);

      ctx.fillStyle = active ? "rgba(250, 204, 21, 0.45)" : "rgba(148, 163, 184, 0.22)";
      ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      ctx.strokeStyle = active ? "#facc15" : "#94a3b8";
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);

      ctx.fillStyle = "#fde68a";
      ctx.fillText(`${move.id}:${fighter.moveFrame}`, fighter.x, fighter.y + 40);
      renderMoveDebug(fighter, move);
    }

    if (debugEnabled) {
      renderFighterDebug(fighter);
    }
  }
}

function renderMoveDebug(fighter: Fighter, move: MoveDefinition): void {
  ctx.fillStyle = "#fde68a";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${move.context}/${move.direction}/${move.button} ${move.role}`,
    fighter.x,
    fighter.y + 56,
  );
  ctx.fillText(
    `s/a/r ${move.startupFrames}/${move.activeFrames}/${move.recoveryFrames} dmg ${move.damage} kb ${move.knockback.x},${move.knockback.y} sh ${move.shieldDamage}`,
    fighter.x,
    fighter.y + 72,
  );
}

function renderShield(fighter: Fighter): void {
  const shieldBox = getShieldBox(fighter);
  const shieldRatio = fighter.shield / fighter.maxShield;

  ctx.fillStyle = `rgba(96, 165, 250, ${0.18 + shieldRatio * 0.22})`;
  ctx.fillRect(shieldBox.x, shieldBox.y, shieldBox.width, shieldBox.height);

  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 3;
  ctx.strokeRect(shieldBox.x, shieldBox.y, shieldBox.width, shieldBox.height);

  if (debugEnabled) {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(shieldBox.x + 4, shieldBox.y + 4, shieldBox.width - 8, shieldBox.height - 8);
  }
}

function renderFighterDebug(fighter: Fighter): void {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${fighter.state} vx:${fighter.velocityX.toFixed(0)} vy:${fighter.velocityY.toFixed(0)} lcd:${fighter.landingJumpCooldownFrames}`,
    fighter.x,
    fighter.y + 24,
  );

  ctx.strokeStyle = "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(fighter.x, fighter.y - fighter.height / 2);
  ctx.lineTo(
    fighter.x + fighter.velocityX * 0.12,
    fighter.y - fighter.height / 2 + fighter.velocityY * 0.06,
  );
  ctx.stroke();
}

function renderHud(interpolationAlpha: number): void {
  renderResourceBars();

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fighting Dreamers", WORLD_WIDTH / 2, 52);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Debug: ${debugEnabled ? "on" : "off"}`, WORLD_WIDTH / 2, 82);

  if (debugEnabled) {
    renderDebugHud(interpolationAlpha);
  }
}

function renderDebugHud(interpolationAlpha: number): void {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Fixed timestep: ${simulationFrames} frames`, WORLD_WIDTH / 2, 104);
  ctx.fillText(`Sim time: ${totalSimulatedSeconds.toFixed(2)}s`, WORLD_WIDTH / 2, 126);
  ctx.fillText(`Render alpha: ${interpolationAlpha.toFixed(2)}`, WORLD_WIDTH / 2, 148);

  renderCommandReadout();
  renderControlsGuide();
}

function renderRoundOverlay(): void {
  if (!winnerName) {
    return;
  }

  ctx.fillStyle = "rgba(15, 17, 23, 0.52)";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${winnerName} wins`, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 12);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Resetting round...", WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 22);
}

function renderResourceBars(): void {
  fighters.forEach((fighter, index) => {
    const isLeftSide = index % 2 === 0;
    const row = Math.floor(index / 2);
    const width = 330;
    const x = isLeftSide ? 28 : WORLD_WIDTH - 28 - width;
    const y = 28 + row * 58;

    renderFighterBars(fighter, x, y, width, isLeftSide ? "left" : "right");
  });
}

function renderFighterBars(
  fighter: Fighter,
  x: number,
  y: number,
  width: number,
  align: CanvasTextAlign,
): void {
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = align;
  ctx.fillText(fighter.name, align === "left" ? x : x + width, y - 8);

  renderBar(x, y, width, 16, fighter.health / fighter.maxHealth, "#22c55e");
  renderBar(x, y + 22, width, 8, fighter.shield / fighter.maxShield, "#60a5fa");
}

function renderBar(
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  fill: string,
): void {
  ctx.fillStyle = "#111827";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width * clamp(ratio, 0, 1), height);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

function renderCommandReadout(): void {
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "left";

  fighters.forEach((fighter, index) => {
    const command = latestCommandsByFighterId.get(fighter.id) ?? idleCommand;
    const y = 500 + index * 20;
    ctx.fillText(
      `${fighter.id} x:${command.moveX} y:${command.moveY} jump:${Number(command.jumpPressed)} weak:${Number(command.weakPressed)} strong:${Number(command.strongPressed)} shield:${Number(command.shieldHeld)}`,
      24,
      y,
    );
  });

  ctx.fillText(`CPU intent: ${cpuController.intent}`, 24, 540 - 10);
}

function renderControlsGuide(): void {
  const lines = [
    "Controls",
    "A/D: move + face",
    "W: jump / up",
    "S: down",
    "J: weak",
    "K: strong",
    "L: shield",
    "`: debug",
  ];
  const lineHeight = 16;
  const padding = 12;
  const width = 166;
  const height = padding * 2 + lines.length * lineHeight;
  const x = WORLD_WIDTH - width - 18;
  const y = WORLD_HEIGHT - height - 18;

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(x, y, width, height);

  ctx.textAlign = "left";
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? "#f8fafc" : "#cbd5e1";
    ctx.fillText(line, x + padding, y + padding + lineHeight * (index + 0.8));
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
