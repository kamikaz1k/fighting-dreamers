import "./styles.css";

const canvas = document.createElement("canvas");
canvas.width = 960;
canvas.height = 540;

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
let previousTime = performance.now();

function render(elapsedSeconds: number): void {
  ctx.fillStyle = "#14181f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#252c38";
  ctx.fillRect(0, 450, canvas.width, 90);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fighting Dreamers", canvas.width / 2, 235);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Canvas loop running: ${elapsedSeconds.toFixed(1)}s`, canvas.width / 2, 265);
}

function frame(currentTime: number): void {
  const deltaSeconds = (currentTime - previousTime) / 1000;
  previousTime = currentTime;

  render(currentTime / 1000);

  if (deltaSeconds >= 0) {
    requestAnimationFrame(frame);
  }
}

requestAnimationFrame(frame);
