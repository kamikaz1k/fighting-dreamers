import {
  FLOOR_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  mainPlatform,
  stagePlatforms,
} from "./config";
import { getCharacter } from "./characters";
import { getCurrentMove, isMoveActive } from "./combat";
import { getHurtbox, getMoveHitbox, getShieldBox } from "./geometry";
import { clamp } from "./math";
import type { MoveDefinition } from "./moves";
import type { Fighter, FighterCommand } from "./types";

export type RenderState = {
  fighters: Fighter[];
  latestCommandsByFighterId: Map<string, FighterCommand>;
  cpuIntent: string;
  debugEnabled: boolean;
  interpolationAlpha: number;
  simulationFrames: number;
  totalSimulatedSeconds: number;
  winnerName: string | null;
};

export function renderGame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.fillStyle = "#14181f";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  renderStage(ctx);
  renderFighters(ctx, state.fighters, state.debugEnabled);
  renderHud(ctx, state);
  renderRoundOverlay(ctx, state.winnerName);
}

function renderStage(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(mainPlatform.x, mainPlatform.y, mainPlatform.width, mainPlatform.height);

  ctx.fillStyle = "#252c38";
  ctx.fillRect(mainPlatform.x, FLOOR_Y, mainPlatform.width, 8);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(mainPlatform.x, mainPlatform.y, mainPlatform.width, mainPlatform.height);

  for (const platform of stagePlatforms) {
    ctx.fillStyle = "#334155";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    ctx.fillStyle = "#64748b";
    ctx.fillRect(platform.x, platform.y, platform.width, 3);
  }
}

function renderFighters(
  ctx: CanvasRenderingContext2D,
  fighters: Fighter[],
  debugEnabled: boolean,
): void {
  for (const fighter of fighters) {
    const hurtbox = getHurtbox(fighter);

    if (fighter.state === "shield") {
      renderShield(ctx, fighter, debugEnabled);
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
      ctx.fillText(`${move.id}:${fighter.moveFrame} ${getMovePhase(fighter, move)}`, fighter.x, fighter.y + 40);
      renderMoveDebug(ctx, fighter, move);
    }

    if (debugEnabled) {
      renderFighterDebug(ctx, fighter);
    }
  }
}

function renderMoveDebug(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  move: MoveDefinition,
): void {
  ctx.fillStyle = "#fde68a";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${move.context}/${move.direction}/${move.button} ${move.role}`,
    fighter.x,
    fighter.y + 56,
  );
  ctx.fillText(
    `phase ${getMovePhase(fighter, move)} s/a/r ${move.startupFrames}/${move.activeFrames}/${move.recoveryFrames}`,
    fighter.x,
    fighter.y + 72,
  );
  ctx.fillText(
    `dmg ${move.damage} kb ${move.knockback.x},${move.knockback.y} sh ${move.shieldDamage} box ${move.hitbox.width}x${move.hitbox.height}`,
    fighter.x,
    fighter.y + 88,
  );
}

function getMovePhase(fighter: Fighter, move: MoveDefinition): "startup" | "active" | "recovery" {
  if (fighter.moveFrame < move.startupFrames) {
    return "startup";
  }

  if (fighter.moveFrame < move.startupFrames + move.activeFrames) {
    return "active";
  }

  return "recovery";
}

function renderShield(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  debugEnabled: boolean,
): void {
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

function renderFighterDebug(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
  const cooldownSummary = Array.from(fighter.moveCooldowns)
    .map(([moveId, frames]) => `${moveId}:${frames}`)
    .join(" ");
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${fighter.characterId} ${fighter.state} vx:${fighter.velocityX.toFixed(0)} vy:${fighter.velocityY.toFixed(0)} lcd:${fighter.landingJumpCooldownFrames} aj:${fighter.airJumpsRemaining}`,
    fighter.x,
    fighter.y + 24,
  );

  if (cooldownSummary) {
    ctx.fillText(`cd ${cooldownSummary}`, fighter.x, fighter.y + 40);
  }

  ctx.strokeStyle = "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(fighter.x, fighter.y - fighter.height / 2);
  ctx.lineTo(
    fighter.x + fighter.velocityX * 0.12,
    fighter.y - fighter.height / 2 + fighter.velocityY * 0.06,
  );
  ctx.stroke();
}

function renderHud(ctx: CanvasRenderingContext2D, state: RenderState): void {
  renderResourceBars(ctx, state.fighters);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fighting Dreamers", WORLD_WIDTH / 2, 52);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Debug: ${state.debugEnabled ? "on" : "off"}`, WORLD_WIDTH / 2, 82);

  if (state.debugEnabled) {
    renderDebugHud(ctx, state);
  }
}

function renderDebugHud(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Fixed timestep: ${state.simulationFrames} frames`, WORLD_WIDTH / 2, 104);
  ctx.fillText(`Sim time: ${state.totalSimulatedSeconds.toFixed(2)}s`, WORLD_WIDTH / 2, 126);
  ctx.fillText(`Render alpha: ${state.interpolationAlpha.toFixed(2)}`, WORLD_WIDTH / 2, 148);

  renderCommandReadout(ctx, state);
  renderTuningReadout(ctx, state.fighters);
  renderControlsGuide(ctx);
}

function renderRoundOverlay(ctx: CanvasRenderingContext2D, winnerName: string | null): void {
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

function renderResourceBars(ctx: CanvasRenderingContext2D, fighters: Fighter[]): void {
  fighters.forEach((fighter, index) => {
    const isLeftSide = index % 2 === 0;
    const row = Math.floor(index / 2);
    const width = 330;
    const x = isLeftSide ? 28 : WORLD_WIDTH - 28 - width;
    const y = 28 + row * 58;

    renderFighterBars(ctx, fighter, x, y, width, isLeftSide ? "left" : "right");
  });
}

function renderFighterBars(
  ctx: CanvasRenderingContext2D,
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

  ctx.fillStyle = "#f8fafc";
  ctx.font = "22px system-ui, sans-serif";
  ctx.textAlign = align;
  ctx.fillText(`${Math.round(fighter.damagePercent)}%`, align === "left" ? x : x + width, y + 18);

  renderBar(ctx, x, y + 28, width, 8, fighter.shield / fighter.maxShield, "#60a5fa");
}

function renderBar(
  ctx: CanvasRenderingContext2D,
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

function renderCommandReadout(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "left";

  state.fighters.forEach((fighter, index) => {
    const command = state.latestCommandsByFighterId.get(fighter.id);
    const y = 500 + index * 20;

    if (!command) {
      return;
    }

    ctx.fillText(
      `${fighter.id} x:${command.moveX} y:${command.moveY} jump:${Number(command.jumpPressed)} weak:${Number(command.weakPressed)} strong:${Number(command.strongPressed)} shield:${Number(command.shieldHeld)}`,
      24,
      y,
    );
  });

  ctx.fillText(`CPU intent: ${state.cpuIntent}`, 24, 540 - 10);
}

function renderTuningReadout(ctx: CanvasRenderingContext2D, fighters: Fighter[]): void {
  const lines = [
    "Tuning",
    ...fighters.flatMap((fighter) => {
      const character = getCharacter(fighter.characterId);

      return [
        `${fighter.id}:${character.id} g ${character.movement.groundAcceleration}/${character.movement.maxGroundSpeed} a ${character.movement.airAcceleration}/${character.movement.maxAirSpeed}`,
        `  grav ${character.movement.gravity} jump ${character.movement.jumpVelocity} cd ${character.movement.landingJumpCooldownFrames} airj ${character.movement.maxAirJumps}`,
        `  shield ${character.shield.box.width}x${character.shield.box.height} drain ${character.shield.holdDrainPerSecond} regen ${character.shield.regenPerSecond}`,
      ];
    }),
  ];
  const lineHeight = 16;
  const padding = 12;
  const width = 318;
  const height = padding * 2 + lines.length * lineHeight;
  const x = 18;
  const y = 72;

  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
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

function renderControlsGuide(ctx: CanvasRenderingContext2D): void {
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
