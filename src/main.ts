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

const inputConfig = {
  bufferFrames: 6,
};

const shieldConfig = {
  holdDrainPerSecond: 12,
  regenPerSecond: 20,
  minToActivate: 10,
  box: {
    width: 92,
    height: 122,
    offsetX: 0,
    offsetY: -62,
  },
};

const roundConfig = {
  koPauseFrames: 90,
};

const debugConfig = {
  enabled: import.meta.env.DEV,
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
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  currentMoveId: string | null;
  moveFrame: number;
  hitOpponentThisMove: boolean;
  hitstopFrames: number;
  hitstunFrames: number;
  bufferedAction: BufferedAction | null;
};

type FighterState = "idle" | "run" | "jump" | "fall" | "attack" | "shield" | "hitstun" | "ko";
type AttackDirection = "neutral" | "side" | "up" | "down";
type AttackButton = "punch" | "kick";

type BufferedAction = {
  button: AttackButton;
  direction: AttackDirection;
  framesRemaining: number;
};

type MoveDefinition = {
  id: string;
  button: "punch" | "kick";
  direction: AttackDirection;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  knockback: { x: number; y: number };
  hitbox: { x: number; y: number; width: number; height: number };
  shieldDamage: number;
  hitstopFrames: number;
  movementMultiplier?: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const moveDefinitions: Record<string, MoveDefinition> = {
  neutralPunch: {
    id: "neutralPunch",
    button: "punch",
    direction: "neutral",
    startupFrames: 5,
    activeFrames: 4,
    recoveryFrames: 12,
    damage: 6,
    knockback: { x: 320, y: -80 },
    hitbox: { x: 24, y: -78, width: 38, height: 24 },
    shieldDamage: 12,
    hitstopFrames: 4,
    movementMultiplier: 0.45,
  },
  sidePunch: {
    id: "sidePunch",
    button: "punch",
    direction: "side",
    startupFrames: 7,
    activeFrames: 4,
    recoveryFrames: 14,
    damage: 8,
    knockback: { x: 390, y: -70 },
    hitbox: { x: 28, y: -76, width: 48, height: 24 },
    shieldDamage: 15,
    hitstopFrames: 5,
    movementMultiplier: 0.4,
  },
  upPunch: {
    id: "upPunch",
    button: "punch",
    direction: "up",
    startupFrames: 6,
    activeFrames: 5,
    recoveryFrames: 15,
    damage: 7,
    knockback: { x: 140, y: -430 },
    hitbox: { x: -14, y: -124, width: 44, height: 48 },
    shieldDamage: 14,
    hitstopFrames: 5,
    movementMultiplier: 0.5,
  },
  downPunch: {
    id: "downPunch",
    button: "punch",
    direction: "down",
    startupFrames: 6,
    activeFrames: 4,
    recoveryFrames: 13,
    damage: 6,
    knockback: { x: 260, y: 160 },
    hitbox: { x: 18, y: -38, width: 42, height: 26 },
    shieldDamage: 13,
    hitstopFrames: 4,
    movementMultiplier: 0.45,
  },
  neutralKick: {
    id: "neutralKick",
    button: "kick",
    direction: "neutral",
    startupFrames: 8,
    activeFrames: 5,
    recoveryFrames: 18,
    damage: 9,
    knockback: { x: 440, y: -110 },
    hitbox: { x: 22, y: -58, width: 54, height: 28 },
    shieldDamage: 18,
    hitstopFrames: 6,
    movementMultiplier: 0.35,
  },
  sideKick: {
    id: "sideKick",
    button: "kick",
    direction: "side",
    startupFrames: 10,
    activeFrames: 5,
    recoveryFrames: 20,
    damage: 11,
    knockback: { x: 560, y: -120 },
    hitbox: { x: 30, y: -62, width: 66, height: 30 },
    shieldDamage: 22,
    hitstopFrames: 7,
    movementMultiplier: 0.28,
  },
  upKick: {
    id: "upKick",
    button: "kick",
    direction: "up",
    startupFrames: 9,
    activeFrames: 6,
    recoveryFrames: 19,
    damage: 10,
    knockback: { x: 160, y: -540 },
    hitbox: { x: -16, y: -132, width: 50, height: 58 },
    shieldDamage: 20,
    hitstopFrames: 6,
    movementMultiplier: 0.32,
  },
  downKick: {
    id: "downKick",
    button: "kick",
    direction: "down",
    startupFrames: 9,
    activeFrames: 5,
    recoveryFrames: 18,
    damage: 9,
    knockback: { x: 360, y: 220 },
    hitbox: { x: 16, y: -32, width: 58, height: 30 },
    shieldDamage: 19,
    hitstopFrames: 6,
    movementMultiplier: 0.35,
  },
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
    const distanceX = context.opponent.x - context.self.x;
    const absDistanceX = Math.abs(distanceX);
    const verticalDelta = context.opponent.y - context.self.y;
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

    if (context.opponent.state === "attack" && absDistanceX < 120 && context.self.shield > 20) {
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
        return { ...idleCommand, moveY: -1, punchPressed: true };
      }

      return { ...idleCommand, moveX: directionToOpponent, kickPressed: true };
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
    health: 100,
    maxHealth: 100,
    shield: 100,
    maxShield: 100,
    currentMoveId: null,
    moveFrame: 0,
    hitOpponentThisMove: false,
    hitstopFrames: 0,
    hitstunFrames: 0,
    bufferedAction: null,
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
    health: 100,
    maxHealth: 100,
    shield: 100,
    maxShield: 100,
    currentMoveId: null,
    moveFrame: 0,
    hitOpponentThisMove: false,
    hitstopFrames: 0,
    hitstunFrames: 0,
    bufferedAction: null,
  },
];

const cpuController = new CpuController();
const controllers: Controller[] = [new KeyboardController(), cpuController];
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
let roundPauseFrames = 0;
let winnerName: string | null = null;
let debugEnabled = debugConfig.enabled;

window.addEventListener("keydown", (event) => {
  if (event.code === "Backquote") {
    debugEnabled = !debugEnabled;
  }
});

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
    if (updateHitstop(fighters[index])) {
      continue;
    }

    updateHitstun(fighters[index]);
    updateActions(fighters[index], latestCommands[index]);
    applyMovement(fighters[index], latestCommands[index]);
    updateMovementState(fighters[index]);
  }

  resolveAttackCollisions();
  updateRoundFlow();
  updateFacing();
  totalSimulatedSeconds += FIXED_TIMESTEP_SECONDS;
  simulationFrames += 1;
}

function updateRoundFlow(): void {
  if (roundPauseFrames > 0) {
    roundPauseFrames -= 1;

    if (roundPauseFrames === 0) {
      resetRound();
    }

    return;
  }

  const loser = fighters.find((fighter) => fighter.health <= 0);

  if (!loser) {
    return;
  }

  const winner = fighters.find((fighter) => fighter !== loser);
  loser.state = "ko";
  loser.velocityX = 0;
  loser.velocityY = 0;
  winnerName = winner?.name ?? null;
  roundPauseFrames = roundConfig.koPauseFrames;
}

function resetRound(): void {
  resetFighter(fighters[0], 360, 1);
  resetFighter(fighters[1], 600, -1);
  winnerName = null;
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
  fighter.hitOpponentThisMove = false;
  fighter.hitstopFrames = 0;
  fighter.hitstunFrames = 0;
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
  if (command.punchPressed || command.kickPressed) {
    fighter.bufferedAction = {
      button: command.punchPressed ? "punch" : "kick",
      direction: getAttackDirection(command),
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

function getMoveForBufferedAction(action: BufferedAction): MoveDefinition {
  const move = Object.values(moveDefinitions).find((definition) => {
    return definition.button === action.button && definition.direction === action.direction;
  });

  if (!move) {
    throw new Error(`Missing move definition for ${action.direction} ${action.button}`);
  }

  return move;
}

function getAttackDirection(command: FighterCommand): AttackDirection {
  if (command.moveY === -1) {
    return "up";
  }

  if (command.moveY === 1) {
    return "down";
  }

  if (command.moveX !== 0) {
    return "side";
  }

  return "neutral";
}

function startAttack(fighter: Fighter, move: MoveDefinition): void {
  fighter.state = "attack";
  fighter.currentMoveId = move.id;
  fighter.moveFrame = 0;
  fighter.hitOpponentThisMove = false;
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
    fighter.hitOpponentThisMove = false;
  }
}

function resolveAttackCollisions(): void {
  resolveAttackCollision(fighters[0], fighters[1]);
  resolveAttackCollision(fighters[1], fighters[0]);
}

function resolveAttackCollision(attacker: Fighter, defender: Fighter): void {
  const move = getCurrentMove(attacker);

  if (!move || !isMoveActive(attacker, move) || attacker.hitOpponentThisMove) {
    return;
  }

  const moveHitbox = getMoveHitbox(attacker, move);
  const blockedByShield = defender.state === "shield"
    && defender.shield > 0
    && rectsOverlap(moveHitbox, getShieldBox(defender));

  if (!blockedByShield && !rectsOverlap(moveHitbox, getHurtbox(defender))) {
    return;
  }

  if (blockedByShield) {
    defender.shield = clamp(defender.shield - move.shieldDamage, 0, defender.maxShield);
    defender.velocityX = attacker.facing * move.knockback.x * 0.35;
  } else {
    defender.health = clamp(defender.health - move.damage, 0, defender.maxHealth);
    defender.velocityX = attacker.facing * move.knockback.x;
    defender.velocityY = move.knockback.y;
    defender.grounded = false;
    defender.state = "hitstun";
    defender.currentMoveId = null;
    defender.moveFrame = 0;
    defender.hitstunFrames = getHitstunFrames(move);
  }

  defender.hitstopFrames = move.hitstopFrames;
  attacker.hitstopFrames = move.hitstopFrames;
  attacker.hitOpponentThisMove = true;
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

function getCurrentMove(fighter: Fighter): MoveDefinition | null {
  if (!fighter.currentMoveId) {
    return null;
  }

  return moveDefinitions[fighter.currentMoveId] ?? null;
}

function getMoveTotalFrames(move: MoveDefinition): number {
  return move.startupFrames + move.activeFrames + move.recoveryFrames;
}

function getHitstunFrames(move: MoveDefinition): number {
  const knockbackMagnitude = Math.hypot(move.knockback.x, move.knockback.y);
  return Math.round(10 + knockbackMagnitude / 42);
}

function isMoveActive(fighter: Fighter, move: MoveDefinition): boolean {
  return fighter.moveFrame >= move.startupFrames
    && fighter.moveFrame < move.startupFrames + move.activeFrames;
}

function getMoveHitbox(
  fighter: Fighter,
  move: MoveDefinition,
): Rect {
  const x = fighter.facing === 1
    ? fighter.x + move.hitbox.x
    : fighter.x - move.hitbox.x - move.hitbox.width;

  return {
    x,
    y: fighter.y + move.hitbox.y,
    width: move.hitbox.width,
    height: move.hitbox.height,
  };
}

function getHurtbox(fighter: Fighter): Rect {
  return {
    x: fighter.x - fighter.width / 2,
    y: fighter.y - fighter.height,
    width: fighter.width,
    height: fighter.height,
  };
}

function getShieldBox(fighter: Fighter): Rect {
  return {
    x: fighter.x + shieldConfig.box.offsetX - shieldConfig.box.width / 2,
    y: fighter.y + shieldConfig.box.offsetY - shieldConfig.box.height / 2,
    width: shieldConfig.box.width,
    height: shieldConfig.box.height,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
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

  if (fighter.state === "attack") {
    fighter.velocityX *= getCurrentMove(fighter)?.movementMultiplier ?? 1;
  }

  if (fighter.state === "shield") {
    fighter.velocityX = 0;
  }

  if (command.jumpPressed && fighter.grounded && fighter.state !== "hitstun" && fighter.state !== "shield") {
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
    }

    if (debugEnabled) {
      renderFighterDebug(fighter);
    }
  }
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
    `${fighter.state} vx:${fighter.velocityX.toFixed(0)} vy:${fighter.velocityY.toFixed(0)}`,
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
  renderFighterBars(fighters[0], 28, 28, 330, "left");
  renderFighterBars(fighters[1], WORLD_WIDTH - 358, 28, 330, "right");
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

  latestCommands.forEach((command, index) => {
    const y = 500 + index * 20;
    ctx.fillText(
      `P${index + 1} x:${command.moveX} y:${command.moveY} jump:${Number(command.jumpPressed)} punch:${Number(command.punchPressed)} kick:${Number(command.kickPressed)} shield:${Number(command.shieldHeld)}`,
      24,
      y,
    );
  });

  ctx.fillText(`CPU intent: ${cpuController.intent}`, 24, 540 - 10);
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
