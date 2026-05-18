# Melee frame data references

This folder keeps local reference material for tuning moves and later building
character-specific move sets.

## Datasets

- `grouped/` contains the prepared grouped JSON dump from
  `pfirsich/meleeFrameDataExtractor`.
- `full-hitboxes/` contains the prepared full-hitbox JSON dump from the same
  extractor.
- `fightcore/characters/` contains raw per-character JSON payloads exported from
  FightCore character pages by `scripts/download-fightcore-frame-data.mjs`.
- `normalized/` contains repo-owned reference JSON emitted by
  `scripts/normalize-melee-frame-data.mjs`.

The extractor dumps are useful for compact move timing and hitbox reference, but
their default prepared dumps do not include every special move. The FightCore
payloads are the better working source for our current Falcon/Marth tuning pass
because they include richer per-move data across grounded attacks, aerials,
specials, grabs, throws, dodges, techs, and edge actions.

## Provenance

- Extractor project: `pfirsich/meleeFrameDataExtractor`
- Prepared grouped dump mirror: `http://melee.theshoemaker.de/?dir=framedata-json`
- Prepared full-hitbox dump mirror:
  `http://melee.theshoemaker.de/?dir=framedata-json-fullhitboxes`
- FightCore refresh source: `https://www.fightcore.gg/characters`

`fightcore/manifest.json` records the pages fetched during the latest refresh,
including the character count and per-character output paths.

## Refreshing FightCore data

Run:

```sh
npm run frame-data:download:fightcore
```

That rewrites `fightcore/characters/*.json` and `fightcore/manifest.json` from
the current FightCore character index.

## Normalizing working data

Run:

```sh
npm run frame-data:normalize
```

The first normalization pass covers Captain Falcon only. It keeps every source
action, labels the actions our engine already implements, and preserves source
hit timing plus extractor metadata without attempting to convert Melee-space
bone-relative hitboxes into canvas rectangles.

Special moves can expose conditional timing. For example, Falcon's side special
records its search window on the move timeline, then stores the punch windows as
`after-contact`; Falcon Dive stores its release hit as `after-grab`.

## Current focus

- `grouped/Captain Falcon.framedata.json`
- `grouped/Marth.framedata.json`
- `full-hitboxes/Captain Falcon.framedata.json`
- `full-hitboxes/Marth.framedata.json`
- `fightcore/characters/227-captainfalcon.json`
- `fightcore/characters/222-marth.json`
