# Fighting Dreamers Plan

## Milestone 1 Goal

Build a minimal Smash-like 2D fighting prototype with Canvas, TypeScript, and Vite. Prioritize feel and combat rules over art. Fighters, hurtboxes, and hitboxes are rectangles for the first milestone. Sprite generation and polished visuals are deferred.

## Core Decisions

- Use Canvas + TypeScript + Vite.
- Use a fixed logical world size of `960x540`.
- Start with one flat stage.
- Use solid left/right stage bounds and a solid floor.
- Use physics-first movement with action states and locks.
- Allow single jump and air steering.
- Use health bars plus fixed per-move knockback.
- Include a dedicated shield button.
- Shield fully blocks health damage.
- Shield uses stamina and decay, but no shield break in milestone 1.
- Include hitstop.
- Do not include attack cancels in milestone 1, but keep the move data model open to future cancel windows.
- Feed keyboard and CPU through the same command interface.
- Use data-driven move definitions in TypeScript objects.
- Wire all 8 directional punch/kick move IDs from the beginning, with shared placeholder tuning allowed.
- Use a debug overlay toggle, default on in development.
- Use a short KO pause followed by automatic reset.

## 1P Controls

- `A`: left
- `D`: right
- `W`: jump / up modifier
- `S`: crouch / down modifier
- `J`: punch
- `K`: kick
- `L`: shield
- Backquote: debug overlay toggle

## Combat Model

- Each fighter has `health` and `shield`.
- Attacks apply health damage unless blocked by shield.
- Shield fully blocks health damage while active.
- Shield drains while held and drains more when absorbing hits.
- Shield regenerates when not held.
- Attacks apply fixed knockback defined per move.
- Hits trigger configurable hitstop.
- Hitstun follows hitstop and knockback.
- A move can only hit the same opponent once per execution.
- No attack cancels in milestone 1.

## Movement Model

- Fighters have position, velocity, facing, grounded state, and action state.
- Gravity applies while airborne.
- Ground acceleration and friction apply while grounded.
- Air steering applies while airborne.
- Jump sets vertical velocity.
- Attacks can lock or dampen movement based on move data.
- Shielding and hitstun override normal movement.
- Auto-flip facing based on opponent position when appropriate.

## Input Model

Both player and CPU controllers produce the same command shape.

```ts
type FighterCommand = {
  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;
  jumpPressed: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
  shieldHeld: boolean;
};
```

Initial controllers:

- `KeyboardController` for player 1.
- `CpuController` for player 2.

Future controllers:

- Gamepad controller.
- Keyboard controller for player 2.
- Replay controller.
- Network controller.

Input buffering:

- Track held keys continuously.
- Track pressed-this-frame buttons.
- Buffer attack and shield commands for a configurable number of frames.
- Capture directional modifier at button press time.
- Do not buffer movement directions.

## Move Data

Moves are defined as TypeScript data objects. Initial move IDs:

- `neutralPunch`
- `sidePunch`
- `upPunch`
- `downPunch`
- `neutralKick`
- `sideKick`
- `upKick`
- `downKick`

Example move shape:

```ts
type MoveDefinition = {
  id: string;
  button: "punch" | "kick";
  direction: "neutral" | "side" | "up" | "down";
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  knockback: { x: number; y: number };
  hitbox: { x: number; y: number; width: number; height: number };
  shieldDamage: number;
  hitstopFrames: number;
  movementMultiplier?: number;
  animation?: string;
  cancelWindows?: Array<{
    fromFrame: number;
    toFrame: number;
    into: Array<"jump" | "shield" | "attack" | "special">;
    requiresHit?: boolean;
  }>;
};
```

`cancelWindows` is reserved for future use and ignored in milestone 1.

## Collision Model

- Use one rectangular body hurtbox per fighter.
- Use one rectangular active attack hitbox per move.
- Hitbox positions are relative to fighter position and facing.
- Shield checks use the same body hurtbox.
- Debug mode draws body hurtboxes and active hitboxes.

Future affordances:

- Convert `hitbox` to `hitboxes`.
- Add state-specific hurtboxes.
- Add sweet spots and sour spots.
- Add circular or elliptical shapes only if a later mechanic requires them.

## CPU Model

Use a small goal/state CPU with reaction delay. CPU must produce commands through the same controller interface as the keyboard player.

Initial CPU goals:

- `approach`: move toward player until in preferred range.
- `retreat`: back away if too close or shield is low.
- `attack`: choose punch/kick variant based on distance and vertical relation.
- `shield`: hold shield briefly if the player is attacking nearby.
- `recover`: regain control after hitstun or knockback.

Initial constraints:

- Add reaction delay so CPU is not frame-perfect.
- Add cooldowns so CPU does not spam attacks.
- Treat difficulty as config values.

## Rendering Model

- Render simple colored rectangle fighters for milestone 1.
- Keep visual state labels distinct from simulation state so sprites can be added later.
- Fighters expose visual states such as `idle`, `run`, `jump`, `fall`, `shield`, `hitstun`, and `attack:sideKick`.
- Debug overlay can be toggled with Backquote.

Debug overlay should show:

- Hurtboxes.
- Active hitboxes.
- Fighter velocity vectors.
- State labels.
- Current move and move frame.
- CPU intent.

## Round Flow

- When a fighter reaches `health <= 0`, enter `ko` state.
- Pause or slow the match for roughly `90` frames.
- Show simple winner text.
- Automatically reset health, shield, positions, velocities, and state.
- No menus or score tracking required in milestone 1.

## Incremental Build Sequence

1. Scaffold Vite + TypeScript app with a Canvas render loop.
2. Add fixed timestep simulation and logical-world scaling.
3. Render stage and two rectangle fighters.
4. Add shared `Controller` / `FighterCommand` interface.
5. Implement 1P keyboard controller and placeholder CPU controller.
6. Add physics movement: walk, jump, air steer, gravity, friction, and solid bounds.
7. Add fighter states: idle, run, jump, fall, attack, shield, hitstun, and KO.
8. Add health and shield UI.
9. Implement data-driven move table and one working punch.
10. Add hurtbox/hitbox collision.
11. Add hitstop, fixed knockback, hitstun, and health damage.
12. Expand to all directional punch/kick move IDs.
13. Add configurable input buffer.
14. Add shield: hold-to-shield, full health block, stamina drain, stamina hit cost, and stamina regen.
15. Add CPU goal state machine with reaction delay.
16. Add KO pause and automatic round reset.
17. Add debug overlay for boxes, state, move frame, velocity, and CPU intent.
18. Verify `npm run build`; add focused tests if the scaffold supports them cheaply.

## Definition Of Done

- `npm run dev` starts the game.
- Browser shows one stage and two rectangle fighters.
- 1P can move, jump, air steer, punch, kick, and shield.
- 2P CPU moves through the same command interface.
- Attacks use directional modifiers and data-driven move definitions.
- Hits apply health damage, hitstop, knockback, and hitstun.
- Shield fully blocks health damage and consumes shield stamina.
- Health bars and shield bars are visible.
- KO triggers a short pause and automatic reset.
- Debug overlay can show hurtboxes, hitboxes, state, move frame, velocity, and CPU intent.
- Code is structured so future 2P, gamepad, sprites, cancel windows, and richer move data are clear extensions.
- `npm run build` succeeds.
- No generated sprites are required for milestone 1.
