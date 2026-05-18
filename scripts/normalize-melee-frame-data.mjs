import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FRAME_DATA_ROOT = path.resolve("reference/melee-frame-data");
const OUTPUT_DIR = path.join(FRAME_DATA_ROOT, "normalized");

const actionTypeByFightCoreType = {
  1: "tilt",
  2: "attack",
  3: "aerial",
  4: "special",
  5: "defense",
  6: "grab",
  7: "tech",
  8: "edge",
};

const captainFalconActionMap = {
  jab1: action("jab", "attack", "ground", "neutral", { gameMoveId: "jab" }),
  ftilt: action("forwardTilt", "tilt", "ground", "forward", { gameMoveId: "forwardTilt" }),
  uaft: action("forwardTiltUp", "tilt", "ground", "forward-up"),
  daft: action("forwardTiltDown", "tilt", "ground", "forward-down"),
  utilt: action("upTilt", "tilt", "ground", "up", { gameMoveId: "upTilt" }),
  dtilt: action("downTilt", "tilt", "ground", "down", { gameMoveId: "downTilt" }),
  fsmash: action("forwardSmash", "smash", "ground", "forward", { gameMoveId: "forwardSmash" }),
  usmash: action("upSmash", "smash", "ground", "up", { gameMoveId: "upSmash" }),
  dsmash: action("downSmash", "smash", "ground", "down", { gameMoveId: "downSmash" }),
  nair: action("neutralAir", "aerial", "air", "neutral", { gameMoveId: "neutralAir" }),
  fair: action("forwardAir", "aerial", "air", "forward", { gameMoveId: "forwardAir" }),
  bair: action("backAir", "aerial", "air", "back", { gameMoveId: "backAir" }),
  uair: action("upAir", "aerial", "air", "up", { gameMoveId: "upAir" }),
  dair: action("downAir", "aerial", "air", "down", { gameMoveId: "downAir" }),
  neutralb: action("neutralSpecial", "special", "ground", "neutral", { gameMoveId: "neutralSpecial" }),
  sideb: action("sideSpecial", "special", "ground", "forward", { gameMoveId: "sideSpecial" }),
  upb: action("upSpecial", "special", "ground", "up", { gameMoveId: "upSpecial" }),
  downb: action("downSpecial", "special", "ground", "down", { gameMoveId: "downSpecial" }),
  aneutralb: action("airNeutralSpecial", "special", "air", "neutral", { gameMoveId: "airNeutralSpecial" }),
  asideb: action("airSideSpecial", "special", "air", "forward", { gameMoveId: "airSideSpecial" }),
  aupb: action("airUpSpecial", "special", "air", "up", { gameMoveId: "airUpSpecial" }),
  adownb: action("airDownSpecial", "special", "air", "down", { gameMoveId: "airDownSpecial" }),
  dattack: action("dashAttack", "dash-attack", "ground", "forward"),
  grab: action("grab", "grab", "ground", "neutral"),
  dashgrab: action("dashGrab", "grab", "ground", "forward"),
  pummel: action("pummel", "grab", "ground", "neutral"),
  fthrow: action("forwardThrow", "throw", "ground", "forward"),
  bthrow: action("backThrow", "throw", "ground", "back"),
  uthrow: action("upThrow", "throw", "ground", "up"),
  dthrow: action("downThrow", "throw", "ground", "down"),
  rollforward: action("rollForward", "defense", "ground", "forward"),
  rollbackwards: action("rollBack", "defense", "ground", "back"),
  spotdodge: action("spotDodge", "defense", "ground", "neutral"),
  airdodge: action("airDodge", "defense", "air", "neutral"),
};

const characterConfigs = {
  captainFalcon: {
    outputFile: "captainFalcon.json",
    fightCoreFile: "fightcore/characters/227-captainfalcon.json",
    groupedFile: "grouped/Captain Falcon.framedata.json",
    fullHitboxesFile: "full-hitboxes/Captain Falcon.framedata.json",
    actionMap: captainFalconActionMap,
  },
};

function action(id, kind, context, direction, overrides = {}) {
  return { id, kind, context, direction, ...overrides };
}

async function main() {
  const requestedCharacterIds = process.argv.slice(2);
  const characterIds = requestedCharacterIds.length > 0
    ? requestedCharacterIds
    : Object.keys(characterConfigs);

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const characterId of characterIds) {
    const config = characterConfigs[characterId];

    if (!config) {
      throw new Error(`Unsupported character normalization config: ${characterId}`);
    }

    const normalizedCharacter = await normalizeCharacter(characterId, config);
    await writeFile(
      path.join(OUTPUT_DIR, config.outputFile),
      `${JSON.stringify(normalizedCharacter, null, 2)}\n`,
    );
    console.log(`Normalized ${normalizedCharacter.name}.`);
  }
}

async function normalizeCharacter(characterId, config) {
  const [fightCore, grouped, fullHitboxes] = await Promise.all([
    readJson(path.join(FRAME_DATA_ROOT, config.fightCoreFile)),
    readJson(path.join(FRAME_DATA_ROOT, config.groupedFile)),
    readJson(path.join(FRAME_DATA_ROOT, config.fullHitboxesFile)),
  ]);

  return {
    schemaVersion: 1,
    characterId,
    name: fightCore.name,
    sourceName: fightCore.normalizedName,
    sources: {
      fightCore: config.fightCoreFile,
      grouped: config.groupedFile,
      fullHitboxes: config.fullHitboxesFile,
    },
    movement: normalizeMovement(fightCore.characterStatistics),
    actions: fightCore.moves
      .map((move) => normalizeAction(move, grouped[move.normalizedName], fullHitboxes[move.normalizedName], config.actionMap))
      .sort(compareActions),
  };
}

function normalizeMovement(stats) {
  return {
    weight: stats.weight,
    gravity: stats.gravity,
    walkSpeed: stats.walkSpeed,
    runSpeed: stats.runSpeed,
    initialDashSpeed: stats.initialDash,
    dashFrames: stats.dashFrames,
    jumpSquatFrames: stats.jumpSquat,
    canWallJump: stats.canWallJump,
    waveDashLength: stats.waveDashLength,
    waveDashLengthRank: stats.waveDashLengthRank,
  };
}

function normalizeAction(move, groupedMove, fullHitboxMove, actionMap) {
  const mappedAction = actionMap[move.normalizedName];
  const activeWindows = normalizeActiveWindows(move);
  const firstActiveFrame = activeWindows[0]?.startFrame ?? null;
  const lastActiveFrame = activeWindows.at(-1)?.endFrame ?? null;
  const inferredKind = actionTypeByFightCoreType[move.type] ?? "unknown";

  return {
    id: mappedAction?.id ?? move.normalizedName,
    sourceId: move.normalizedName,
    name: move.name,
    kind: mappedAction?.kind ?? inferredKind,
    context: mappedAction?.context ?? inferContext(move.normalizedName),
    direction: mappedAction?.direction ?? inferDirection(move.normalizedName),
    gameMoveId: mappedAction?.gameMoveId ?? null,
    implementationStatus: mappedAction?.gameMoveId ? "implemented" : "reference-only",
    frames: {
      total: normalizeOptionalNumber(move.totalFrames),
      firstActive: firstActiveFrame,
      lastActive: lastActiveFrame,
      startup: firstActiveFrame === null ? null : Math.max(0, firstActiveFrame - 1),
      recovery: move.totalFrames && lastActiveFrame !== null
        ? Math.max(0, move.totalFrames - lastActiveFrame)
        : null,
      interruptibleAsSoonAs: normalizeOptionalNumber(move.iasa),
      landingLag: normalizeOptionalNumber(move.landLag),
      lCanceledLandingLag: normalizeOptionalNumber(move.lCanceledLandLag),
      autoCancelBefore: normalizeOptionalNumber(move.autoCancelBefore),
      autoCancelAfter: normalizeOptionalNumber(move.autoCancelAfter),
    },
    activeWindows,
    sourceDifferences: collectSourceDifferences(move, groupedMove),
    groupedExtractor: groupedMove ? normalizeGroupedExtractor(groupedMove) : null,
    fullHitboxExtractor: fullHitboxMove ? normalizeFullHitboxExtractor(fullHitboxMove) : null,
  };
}

function normalizeActiveWindows(move) {
  return move.hits.map((hit, index) => ({
    id: `hit${index + 1}`,
    startFrame: normalizeOptionalNumber(hit.start),
    endFrame: normalizeOptionalNumber(hit.end),
    hitboxes: hit.hitboxes.map((hitbox) => ({
      id: hitbox.name,
      damage: hitbox.damage,
      angleDeg: hitbox.angle,
      knockbackGrowth: hitbox.knockbackGrowth,
      setKnockback: hitbox.setKnockback,
      baseKnockback: hitbox.baseKnockback,
      effect: hitbox.effect,
      shieldStunFrames: hitbox.shieldstun,
      hitlag: {
        attackerFrames: hitbox.hitlagAttacker,
        defenderFrames: hitbox.hitlagDefender,
      },
    })),
  }));
}

function normalizeGroupedExtractor(move) {
  return {
    totalFrames: normalizeOptionalNumber(move.totalFrames),
    interruptibleAsSoonAs: normalizeOptionalNumber(move.iasa),
    hitWindows: move.hitFrames?.map((window) => ({
      startFrame: normalizeOptionalNumber(window.start),
      endFrame: normalizeOptionalNumber(window.end),
      hitboxIndexes: window.hitboxes,
    })) ?? [],
  };
}

function normalizeFullHitboxExtractor(move) {
  return {
    totalFrames: normalizeOptionalNumber(move.totalFrames),
    interruptibleAsSoonAs: normalizeOptionalNumber(move.iasa),
    hitWindows: move.hitFrames?.map((window) => ({
      startFrame: normalizeOptionalNumber(window.start),
      endFrame: normalizeOptionalNumber(window.end),
      hitboxes: window.hitboxes.map((hitbox) => ({
        id: hitbox.id,
        bone: hitbox.bone,
        size: hitbox.size,
        offset: {
          x: hitbox.x,
          y: hitbox.y,
          z: hitbox.z,
        },
        groupId: hitbox.groupId,
      })),
    })) ?? [],
  };
}

function collectSourceDifferences(fightCoreMove, groupedMove) {
  if (!groupedMove) {
    return [];
  }

  const differences = [];

  if (normalizeOptionalNumber(fightCoreMove.totalFrames) !== normalizeOptionalNumber(groupedMove.totalFrames)) {
    differences.push({
      field: "totalFrames",
      fightCore: normalizeOptionalNumber(fightCoreMove.totalFrames),
      groupedExtractor: normalizeOptionalNumber(groupedMove.totalFrames),
    });
  }

  const fightCoreWindows = fightCoreMove.hits.map((hit) => ({
    startFrame: normalizeOptionalNumber(hit.start),
    endFrame: normalizeOptionalNumber(hit.end),
  }));
  const groupedWindows = groupedMove.hitFrames?.map((window) => ({
    startFrame: normalizeOptionalNumber(window.start),
    endFrame: normalizeOptionalNumber(window.end),
  })) ?? [];

  if (JSON.stringify(fightCoreWindows) !== JSON.stringify(groupedWindows)) {
    differences.push({
      field: "activeWindows",
      fightCore: fightCoreWindows,
      groupedExtractor: groupedWindows,
    });
  }

  return differences;
}

function inferContext(sourceId) {
  if (sourceId.startsWith("a") || sourceId === "airdodge") {
    return "air";
  }

  return "ground";
}

function inferDirection(sourceId) {
  if (sourceId.startsWith("f")) {
    return "forward";
  }

  if (sourceId.startsWith("b")) {
    return "back";
  }

  if (sourceId.startsWith("u")) {
    return "up";
  }

  if (sourceId.startsWith("d")) {
    return "down";
  }

  return "neutral";
}

function normalizeOptionalNumber(value) {
  return typeof value === "number" ? value : null;
}

function compareActions(left, right) {
  if (left.implementationStatus !== right.implementationStatus) {
    return left.implementationStatus === "implemented" ? -1 : 1;
  }

  return left.id.localeCompare(right.id);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

await main();
