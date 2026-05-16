import { getNearestOpponent } from "./fighters";
import type { Controller, ControllerContext, FighterCommand } from "./types";

export const idleCommand: FighterCommand = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false,
  attackPressed: false,
  smashPressed: false,
  specialPressed: false,
  shieldHeld: false,
};

export type CpuIntent = "approach" | "retreat" | "attack" | "shield" | "recover";

export class CpuController implements Controller {
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
        return { ...idleCommand, moveY: -1, attackPressed: true };
      }

      return { ...idleCommand, moveX: directionToOpponent, specialPressed: true };
    }

    this.intent = "approach";
    return { ...idleCommand, moveX: directionToOpponent };
  }
}

export class KeyboardController implements Controller {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();
  private readonly releasedKeys = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (!this.heldKeys.has(event.code)) {
        this.pressedKeys.add(event.code);
      }

      this.heldKeys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.heldKeys.delete(event.code);
      this.releasedKeys.add(event.code);
    });
  }

  update(): FighterCommand {
    const command: FighterCommand = {
      moveX: this.readHorizontal(),
      moveY: this.readVertical(),
      jumpPressed: this.consumePressed("Space"),
      jumpHeld: this.heldKeys.has("Space"),
      jumpReleased: this.consumeReleased("Space"),
      attackPressed: this.consumePressed("KeyJ"),
      smashPressed: this.consumePressed("KeyJ") && this.hasPressedDirection(),
      specialPressed: this.consumePressed("KeyK"),
      shieldHeld: this.heldKeys.has("KeyL"),
    };

    this.pressedKeys.clear();
    this.releasedKeys.clear();
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

  private consumeReleased(code: string): boolean {
    return this.releasedKeys.has(code);
  }

  private hasPressedDirection(): boolean {
    return this.pressedKeys.has("KeyA")
      || this.pressedKeys.has("KeyD")
      || this.pressedKeys.has("KeyW")
      || this.pressedKeys.has("KeyS");
  }
}
