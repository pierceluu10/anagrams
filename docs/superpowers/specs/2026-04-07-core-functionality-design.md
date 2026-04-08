# Swagrams Core Functionality — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Context

The codebase has the full scaffold (UI, DB schema, API routes, game engine) but several pieces are wired to demo/placeholder values or left disconnected. This spec covers making the game actually playable end-to-end without touching any UI styling or layout.

---

## Scope

1. Dictionary API validation (replace hardcoded ANSWER_MAP lookup)
2. Solo mode functional fixes (initial state, letter button clicks, timer ring)
3. Multi-round flow + results page wired to real data

No CSS, layout, or component changes.

---

## 1. Dictionary API Validation

**File:** `src/lib/game/engine.ts`

`validateSubmission` becomes async. Validation order (fail-fast):
1. Normalize input (trim, lowercase) — synchronous
2. Length check: 3–6 chars — synchronous
3. `canBuildFromRack(word, rack)` — synchronous
4. `fetch("https://api.dictionaryapi.dev/api/v2/entries/en/<word>")` — async; 200 = valid, 404 = not a word

`ANSWER_MAP` is renamed to `CURATED_ANSWERS` and exported — it's no longer used for validation but is used by the results page to compute missed words.

`scoreWord` remains synchronous and unchanged.

**Error handling:** network errors during dictionary fetch should surface as a specific `"Could not reach dictionary"` error (not silently pass or silently fail).

---

## 2. Solo Mode Functional Fixes

**File:** `src/lib/hooks/useSoloStitchGame.ts`

- Reset initial state: `score = 0`, `wordsFound = 0`, `lastWord = "—"`
- `submit` becomes async (awaits the new async `validateSubmission`)
- Export `rack` and `typed` state values (needed for results navigation)

**File:** `src/app/solo/page.tsx`

- Letter buttons: add `onClick` that appends the clicked letter to `typed`, using `canAppendFromRack` to guard overflow/unavailable letters (same logic already used in the match page's keyboard handler)
- Timer ring `strokeDashoffset`: compute from `(remainingMs / totalMs) * 377` instead of the hardcoded `94`. `totalMs = 60_000`. Both values are already available from the hook.
- On `round.status === "complete"` (round just ended): store results in `sessionStorage` then navigate to `/results`

---

## 3. Multi-round Flow

### Solo → Results → Play Again

When `round.status` transitions to `"complete"` in the solo hook, the page:
1. Writes to `sessionStorage` under key `"swagrams_solo_result"`: `{ rack: string, score: number, words: string[] }`
2. `router.push("/results")`

On results page:
- Detect solo mode by checking `sessionStorage.getItem("swagrams_solo_result")` — if present, solo; if absent, check URL for `lobbyId` (multiplayer)
- Parse `rack`, `score`, `words` from the stored JSON
- Missed words = `CURATED_ANSWERS[rack] ?? []` filtered against submitted words
- "Play Again" clears sessionStorage and pushes to `/solo`

### Multiplayer → Results → Play Again

- Match page already auto-finalizes when timer hits 0
- After `finalize` resolves and `round.status` becomes `"complete"` in the realtime snapshot, navigate to `/results?lobbyId=<id>` (existing path)
- Results page already fetches lobby state from API for multiplayer
- Missed words: compare `state.submissions` words against `CURATED_ANSWERS[round.rack]`
- "Play Again" pushes to `/match/<lobbyId>` — players ready up for the next round

---

## 4. Results Page Wiring

**File:** `src/app/results/page.tsx`

Remove all hardcoded fallback values (`1240`, `18`, `["BRIGHT", "GRAIN", ...]`). Real data sources:
- Solo: sessionStorage
- Multiplayer: Supabase API (already implemented)

**Missed words logic** (shared):
```
const missedWords = (CURATED_ANSWERS[rack] ?? []).filter(
  (w) => !submittedWords.has(w)
)
```

**"Reveal Missed Words" button**: toggles a `revealed` boolean in local state. When `false`, words in the grid are blurred (`filter: blur(4px)` inline style, no class changes). When `true`, blur is removed.

**"Play Again"** routes correctly based on source (solo vs multiplayer).

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/game/engine.ts` | `validateSubmission` async, ANSWER_MAP → CURATED_ANSWERS (exported) |
| `src/lib/hooks/useSoloStitchGame.ts` | Reset initial state, async submit, export rack/typed |
| `src/app/solo/page.tsx` | Letter button onClick, timer ring computation, navigate to results on complete |
| `src/app/match/[lobbyId]/page.tsx` | Navigate to results after round finalizes |
| `src/app/results/page.tsx` | Read real data from sessionStorage/API, missed words, reveal toggle, play again routing |

---

## Verification

1. `npm test` — engine unit tests must pass with async `validateSubmission`
2. Solo: start game, submit a real word → score increments; submit a nonsense word → rejected with error; round timer counts down and ring animates; round ends → redirects to results
3. Results (solo): correct score and words shown; missed words revealed on button click; Play Again returns to solo
4. Multiplayer: submit word → accepted/rejected; round ends → redirects to results for both players; Play Again returns to lobby
5. Dictionary down: submitting any word shows "Could not reach dictionary" error
