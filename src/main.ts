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
