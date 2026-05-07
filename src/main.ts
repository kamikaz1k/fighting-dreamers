import "./styles.css";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_ACCUMULATED_SECONDS = 0.25;

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

  ctx.fillStyle = "#252c38";
  ctx.fillRect(0, 450, WORLD_WIDTH, 90);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fighting Dreamers", WORLD_WIDTH / 2, 230);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Fixed timestep: ${simulationFrames} frames`, WORLD_WIDTH / 2, 260);
  ctx.fillText(`Sim time: ${totalSimulatedSeconds.toFixed(2)}s`, WORLD_WIDTH / 2, 282);
  ctx.fillText(`Render alpha: ${interpolationAlpha.toFixed(2)}`, WORLD_WIDTH / 2, 304);
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
