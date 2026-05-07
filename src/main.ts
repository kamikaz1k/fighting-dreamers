import "./styles.css";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const FLOOR_Y = 450;
const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_ACCUMULATED_SECONDS = 0.25;

type Fighter = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  facing: -1 | 1;
};

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
    x: 360,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: "#38bdf8",
    facing: 1,
  },
  {
    name: "CPU",
    x: 600,
    y: FLOOR_Y,
    width: 52,
    height: 104,
    color: "#fb7185",
    facing: -1,
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

  totalSimulatedSeconds += FIXED_TIMESTEP_SECONDS;
  simulationFrames += 1;
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
