import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const BASE_URL = "https://www.fightcore.gg";
const CHARACTERS_URL = `${BASE_URL}/characters`;
const OUTPUT_ROOT = path.resolve("reference/melee-frame-data/fightcore");
const CHARACTER_OUTPUT_DIR = path.join(OUTPUT_ROOT, "characters");
const execFileAsync = promisify(execFile);

function extractCharacterLinks(html) {
  const matches = html.matchAll(/href="\/characters\/(\d+)\/([^"/?#]+)\/?"/g);
  const byPath = new Map();

  for (const [, id, slug] of matches) {
    const relativePath = `/characters/${id}/${slug}/`;
    byPath.set(relativePath, {
      id: Number(id),
      slug,
      url: `${BASE_URL}${relativePath}`,
    });
  }

  return [...byPath.values()].sort((left, right) => left.id - right.id);
}

function extractCharacterPayload(html, url) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );

  if (!match) {
    throw new Error(`Could not find __NEXT_DATA__ in ${url}`);
  }

  const payload = JSON.parse(match[1]);
  const character = payload?.props?.pageProps?.data?.character;

  if (!character) {
    throw new Error(`Could not find character payload in ${url}`);
  }

  return character;
}

function fileNameFor(character) {
  return `${character.fightCoreId}-${character.normalizedName}.json`;
}

async function fetchText(url) {
  const { stdout } = await execFileAsync("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--user-agent",
    "fighting-dreamers-frame-data-sync/1.0",
    url,
  ], {
    maxBuffer: 16 * 1024 * 1024,
  });

  return stdout;
}

async function main() {
  await mkdir(CHARACTER_OUTPUT_DIR, { recursive: true });

  const indexHtml = await fetchText(CHARACTERS_URL);
  const characterLinks = extractCharacterLinks(indexHtml);

  if (characterLinks.length === 0) {
    throw new Error("No character links found on FightCore character index.");
  }

  const manifestCharacters = [];

  for (const link of characterLinks) {
    const html = await fetchText(link.url);
    const character = extractCharacterPayload(html, link.url);
    const file = fileNameFor(character);

    await writeFile(
      path.join(CHARACTER_OUTPUT_DIR, file),
      `${JSON.stringify(character, null, 2)}\n`,
    );

    manifestCharacters.push({
      id: character.fightCoreId,
      name: character.name,
      normalizedName: character.normalizedName,
      slug: decodeURIComponent(link.slug),
      sourceUrl: link.url,
      file: `characters/${file}`,
      moveCount: character.moves.length,
    });
  }

  const manifest = {
    source: CHARACTERS_URL,
    downloadedAt: new Date().toISOString(),
    characterCount: manifestCharacters.length,
    characters: manifestCharacters,
  };

  await writeFile(
    path.join(OUTPUT_ROOT, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(`Downloaded ${manifestCharacters.length} FightCore character payloads.`);
}

await main();
