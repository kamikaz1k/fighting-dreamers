import "./styles.css";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const FLOOR_Y = 450;
const STAGE_LEFT = 40;
const STAGE_RIGHT = 920;
const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_ACCUMULATED_SECONDS = 0.25;

const movementConfig = {
  groundAcceleration: 2600,
  airAcceleration: 1450,
  maxGroundSpeed: 285,
  maxAirSpeed: 245,
  groundFriction: 2100,
  gravity: 1850,
  jumpVelocity: -720,
};

type Fighter = {
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
};

type FighterState = "idle" | "run" | "jump" | "fall" | "attack" | "shield" | "hitstun" | "ko";

type FighterCommand = {
  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;
  jumpPressed: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
  shieldHeld: boolean;
};

type ControllerContext = {
  self: Fighter;
  opponent: Fighter;
  frame: number;
};

interface Controller {
  update(context: ControllerContext): FighterCommand;
}

const idleCommand: FighterCommand = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  punchPressed: false,
  kickPressed: false,
  shieldHeld: false,
};

class IdleController implements Controller {
  update(): FighterCommand {
    return idleCommand;
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
      punchPressed: this.consumePressed("KeyJ"),
      kickPressed: this.consumePressed("KeyK"),
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
  },
  {
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
  },
];

const controllers: Controller[] = [new KeyboardController(), new IdleController()];
const latestCommands: FighterCommand[] = [{ ...idleCommand }, { ...idleCommand }];

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

function update(): void {
  for (let index = 0; index < fighters.length; index += 1) {
    const fighter = fighters[index];
    const opponent = fighters[index === 0 ? 1 : 0];
    latestCommands[index] = controllers[index]?.update({
      self: fighter,
      opponent,
      frame: simulationFrames,
    }) ?? idleCommand;
  }

  for (let index = 0; index < fighters.length; index += 1) {
    applyMovement(fighters[index], latestCommands[index]);
    updateMovementState(fighters[index]);
  }

  updateFacing();
  totalSimulatedSeconds += FIXED_TIMESTEP_SECONDS;
  simulationFrames += 1;
}

function updateMovementState(fighter: Fighter): void {
  if (fighter.state === "attack" || fighter.state === "shield" || fighter.state === "hitstun" || fighter.state === "ko") {
    return;
  }

  if (!fighter.grounded) {
    fighter.state = fighter.velocityY < 0 ? "jump" : "fall";
    return;
  }

  fighter.state = Math.abs(fighter.velocityX) > 5 ? "run" : "idle";
}

function applyMovement(fighter: Fighter, command: FighterCommand): void {
  const acceleration = fighter.grounded
    ? movementConfig.groundAcceleration
    : movementConfig.airAcceleration;
  const maxSpeed = fighter.grounded ? movementConfig.maxGroundSpeed : movementConfig.maxAirSpeed;

  if (command.moveX !== 0) {
    fighter.velocityX += command.moveX * acceleration * FIXED_TIMESTEP_SECONDS;
  } else if (fighter.grounded) {
    fighter.velocityX = moveToward(
      fighter.velocityX,
      0,
      movementConfig.groundFriction * FIXED_TIMESTEP_SECONDS,
    );
  }

  fighter.velocityX = clamp(fighter.velocityX, -maxSpeed, maxSpeed);

  if (command.jumpPressed && fighter.grounded) {
    fighter.velocityY = movementConfig.jumpVelocity;
    fighter.grounded = false;
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
  }
}

function updateFacing(): void {
  const [player, cpu] = fighters;

  if (!player || !cpu) {
    return;
  }

  player.facing = player.x <= cpu.x ? 1 : -1;
  cpu.facing = cpu.x <= player.x ? 1 : -1;
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
    const left = fighter.x - fighter.width / 2;
    const top = fighter.y - fighter.height;

    ctx.fillStyle = fighter.color;
    ctx.fillRect(left, top, fighter.width, fighter.height);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(fighter.x + fighter.facing * 8 - 3, top + 20, 6, 6);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fighter.name, fighter.x, top - 12);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(
      `${fighter.state} vx:${fighter.velocityX.toFixed(0)} vy:${fighter.velocityY.toFixed(0)}`,
      fighter.x,
      fighter.y + 24,
    );
  }
}

function renderHud(interpolationAlpha: number): void {
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fighting Dreamers", WORLD_WIDTH / 2, 52);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Fixed timestep: ${simulationFrames} frames`, WORLD_WIDTH / 2, 82);
  ctx.fillText(`Sim time: ${totalSimulatedSeconds.toFixed(2)}s`, WORLD_WIDTH / 2, 104);
  ctx.fillText(`Render alpha: ${interpolationAlpha.toFixed(2)}`, WORLD_WIDTH / 2, 126);

  renderCommandReadout();
}

function renderCommandReadout(): void {
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "left";

  latestCommands.forEach((command, index) => {
    const y = 500 + index * 20;
    ctx.fillText(
      `P${index + 1} x:${command.moveX} y:${command.moveY} jump:${Number(command.jumpPressed)} punch:${Number(command.punchPressed)} kick:${Number(command.kickPressed)} shield:${Number(command.shieldHeld)}`,
      24,
      y,
    );
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
