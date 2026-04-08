# Core Functionality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the full game loop: dictionary API validation, working solo mode, auto-navigation to a real results page, and multi-round support.

**Architecture:** `validateSubmission` in the game engine becomes async and calls `api.dictionaryapi.dev` instead of the local ANSWER_MAP. The ANSWER_MAP is renamed `CURATED_ANSWERS` and used only on the results page to compute missed words. Solo mode stores round results in `sessionStorage` and navigates to `/results`; the multiplayer match page navigates to `/results?lobbyId=X` after the round finalizes.

**Tech Stack:** Next.js 16, React 19, Supabase, `api.dictionaryapi.dev` (free, no auth), Vitest

---

## File Map

| File | Role |
|------|------|
| `src/lib/words/pools.ts` | Rename `ANSWER_MAP` → `CURATED_ANSWERS` |
| `src/lib/game/engine.ts` | `validateSubmission` becomes async, calls dictionary API |
| `src/lib/game/engine.test.ts` | Update tests for async, mock `fetch` |
| `src/lib/supabase/db.ts` | `await validateSubmission(...)` in `submitWord` |
| `src/lib/hooks/useSoloStitchGame.ts` | Reset initial state, add `typeChar`, `submittedWords`, `completed` |
| `src/app/solo/page.tsx` | Wire letter button `onClick`, fix timer ring, navigate to results |
| `src/app/match/[lobbyId]/page.tsx` | Auto-navigate to results after round finalizes |
| `src/app/results/page.tsx` | Read real data, compute missed words, reveal toggle, play again |

---

### Task 1: Rename ANSWER_MAP → CURATED_ANSWERS in pools.ts

**Files:**
- Modify: `src/lib/words/pools.ts`
- Modify: `src/lib/game/engine.ts` (update import)

- [ ] **Step 1: Rename the export in pools.ts**

In `src/lib/words/pools.ts`, change:
```typescript
export const ANSWER_MAP = buildAnswerMap();
```
to:
```typescript
export const CURATED_ANSWERS = buildAnswerMap();
```

- [ ] **Step 2: Update the import in engine.ts**

In `src/lib/game/engine.ts`, change:
```typescript
import { ANSWER_MAP, ROUND_SECONDS, getRandomPoolEntry, randomizeRack } from "@/lib/words/pools";
```
to:
```typescript
import { CURATED_ANSWERS, ROUND_SECONDS, getRandomPoolEntry, randomizeRack } from "@/lib/words/pools";
```

Also update the reference inside `validateSubmission`:
```typescript
  const key = rack.split("").sort().join("");
  const validSet = CURATED_ANSWERS.get(key);
  if (!validSet || !validSet.has(word)) {
    return { valid: false, reason: "Word not in this round's dictionary." };
  }
```

- [ ] **Step 3: Run tests to confirm nothing is broken**

```bash
npm test
```
Expected: all 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/words/pools.ts src/lib/game/engine.ts
git commit -m "refactor: rename ANSWER_MAP to CURATED_ANSWERS"
```

---

### Task 2: Make validateSubmission async with dictionary API

**Files:**
- Modify: `src/lib/game/engine.ts`

- [ ] **Step 1: Rewrite validateSubmission as async**

Replace the entire `validateSubmission` function in `src/lib/game/engine.ts`:

```typescript
export async function validateSubmission(wordInput: string, rack: string): Promise<ValidationResult> {
  const word = normalizeWord(wordInput);
  if (word.length < 3 || word.length > 6) {
    return { valid: false, reason: "Words must be 3-6 letters." };
  }
  if (!canBuildFromRack(word, rack)) {
    return { valid: false, reason: "Word cannot be built from this rack." };
  }

  let res: Response;
  try {
    res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  } catch {
    return { valid: false, reason: "Could not reach dictionary." };
  }

  if (res.status === 404) {
    return { valid: false, reason: "Not a valid word." };
  }
  if (!res.ok) {
    return { valid: false, reason: "Could not reach dictionary." };
  }

  return { valid: true, reason: "ok", score: scoreWord(word), word };
}
```

Also remove the now-unused `CURATED_ANSWERS` reference inside the old `validateSubmission` body (the key/validSet lines are gone — the import of `CURATED_ANSWERS` stays because the results page will import it from `pools.ts` directly, but `engine.ts` no longer needs it). Update the import:

```typescript
import { ROUND_SECONDS, getRandomPoolEntry, randomizeRack } from "@/lib/words/pools";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/game/engine.ts
git commit -m "feat: async validateSubmission using dictionaryapi.dev"
```

---

### Task 3: Update engine tests for async validateSubmission

**Files:**
- Modify: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Rewrite engine.test.ts**

Replace the entire file content with:

```typescript
/** Swagrams — engine tests */

import { afterEach, describe, expect, it, vi } from "vitest";
import { canBuildFromRack, scoreWord, validateSubmission } from "@/lib/game/engine";

describe("game engine", () => {
  afterEach(() => vi.restoreAllMocks());

  it("validates letters against rack", () => {
    expect(canBuildFromRack("steam", "stream")).toBe(true);
    expect(canBuildFromRack("streak", "stream")).toBe(false);
  });

  it("scores by word length", () => {
    expect(scoreWord("cat")).toBe(1);
    expect(scoreWord("tame")).toBe(2);
    expect(scoreWord("stream")).toBe(7);
  });

  it("rejects word shorter than 3 letters without fetching", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const result = await validateSubmission("me", "stream");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("Words must be 3-6 letters.");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects word that cannot be built from rack without fetching", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const result = await validateSubmission("streak", "stream");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("Word cannot be built from this rack.");
    expect(spy).not.toHaveBeenCalled();
  });

  it("accepts a real word confirmed by dictionary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));
    const result = await validateSubmission("master", "stream");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.word).toBe("master");
      expect(result.score).toBe(7);
    }
  });

  it("rejects a word not in dictionary (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    const result = await validateSubmission("stearm", "stream");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("Not a valid word.");
  });

  it("returns network error message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const result = await validateSubmission("steam", "stream");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("Could not reach dictionary.");
  });

  it("returns network error message on non-404 error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response));
    const result = await validateSubmission("steam", "stream");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("Could not reach dictionary.");
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/engine.test.ts
git commit -m "test: update engine tests for async validateSubmission"
```

---

### Task 4: Await validateSubmission in db.ts

**Files:**
- Modify: `src/lib/supabase/db.ts:105-106`

- [ ] **Step 1: Await the validation call**

In `src/lib/supabase/db.ts`, find the `submitWord` function and change:
```typescript
  const valid = validateSubmission(word, round.rack);
```
to:
```typescript
  const valid = await validateSubmission(word, round.rack);
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all tests still pass (db.ts is not unit-tested, but engine tests should still be green).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/db.ts
git commit -m "fix: await async validateSubmission in submitWord"
```

---

### Task 5: Update useSoloStitchGame hook

**Files:**
- Modify: `src/lib/hooks/useSoloStitchGame.ts`

- [ ] **Step 1: Replace the hook file**

Replace the entire content of `src/lib/hooks/useSoloStitchGame.ts`:

```typescript
"use client";

// Swagrams — solo Stitch UI game state

import { useCallback, useEffect, useMemo, useState } from "react";
import { canBuildFromRack, generateRound, validateSubmission } from "@/lib/game/engine";
import { ROUND_SECONDS } from "@/lib/words/pools";

function shuffle(value: string) {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function formatTime(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function useSoloStitchGame() {
  const [round, setRound] = useState(generateRound());
  const [rack, setRack] = useState(round.rack);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [lastWord, setLastWord] = useState("—");
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const totalMs = ROUND_SECONDS * 1000;
  const active = started && round.status === "active";
  const completed = started && round.status === "complete";
  const remainingMs = active ? Math.max(0, new Date(round.endsAt).getTime() - nowMs) : 0;
  const timerProgress = active ? remainingMs / totalMs : 0;
  const timerLabel = formatTime(remainingMs);

  const start = useCallback(() => {
    if (started) return;
    setCountdown(3);
  }, [started]);

  const shuffleRack = useCallback(() => {
    if (!active) return;
    setRack((value) => shuffle(value));
  }, [active]);

  const clearWord = useCallback(() => {
    setTyped("");
  }, []);

  const typeChar = useCallback((letter: string) => {
    if (!active) return;
    setTyped((v) => {
      if (v.length >= 6) return v;
      if (!canBuildFromRack(`${v}${letter}`, rack)) return v;
      return `${v}${letter}`;
    });
  }, [active, rack]);

  const submit = useCallback(async () => {
    if (!active) return;
    const result = await validateSubmission(typed, round.rack);
    if (!result.valid) return;
    setScore((v) => v + result.score);
    setSubmittedWords((v) => [...v, result.word]);
    setLastWord(result.word.toUpperCase());
    setTyped("");
  }, [active, round.rack, typed]);

  const letterButtons = useMemo(() => rack.toUpperCase().split(""), [rack]);
  const slotLetters = useMemo(() => {
    const up = typed.toUpperCase().slice(0, 6);
    return Array.from({ length: 6 }, (_, i) => up[i] ?? "");
  }, [typed]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (remainingMs <= 0) {
      const id = window.setTimeout(() => {
        setRound((prev) => ({ ...prev, status: "complete" }));
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [active, remainingMs]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const id = window.setTimeout(() => {
        const next = generateRound();
        setRound(next);
        setRack(next.rack);
        setTyped("");
        setStarted(true);
        setCountdown(null);
      }, 0);
      return () => clearTimeout(id);
    }
    const id = window.setTimeout(() => setCountdown((v) => (v ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void submit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearWord();
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        shuffleRack();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        setTyped((v) => v.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        typeChar(event.key.toLowerCase());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, clearWord, shuffleRack, submit, typeChar]);

  return {
    active,
    completed,
    countdown,
    start,
    timerLabel,
    timerProgress,
    score,
    wordsFound: submittedWords.length,
    submittedWords,
    lastWord,
    slotLetters,
    letterButtons,
    rack: round.rack,
    typed,
    setTyped,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all tests pass (hook is not unit-tested).

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useSoloStitchGame.ts
git commit -m "feat: solo hook - reset state, typeChar, submittedWords, completed, timerProgress"
```

---

### Task 6: Wire solo page — letter buttons, timer ring, navigate to results

**Files:**
- Modify: `src/app/solo/page.tsx`

- [ ] **Step 1: Update the solo page**

Replace the entire content of `src/app/solo/page.tsx`:

```typescript
"use client";

// Swagrams — solo play

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StickyScoreboard } from "@/components/stitch/StickyScoreboard";
import { useSoloStitchGame } from "@/lib/hooks/useSoloStitchGame";

const TIMER_CIRCUMFERENCE = 377;

export default function SoloPage() {
  const router = useRouter();
  const {
    active,
    completed,
    countdown,
    start,
    timerLabel,
    timerProgress,
    score,
    wordsFound,
    lastWord,
    slotLetters,
    letterButtons,
    rack,
    submittedWords,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  } = useSoloStitchGame();

  useEffect(() => {
    if (!completed) return;
    sessionStorage.setItem(
      "swagrams_solo_result",
      JSON.stringify({ rack, score, words: submittedWords })
    );
    router.push("/results");
  }, [completed, rack, score, submittedWords, router]);

  const strokeDashoffset = String((1 - timerProgress) * TIMER_CIRCUMFERENCE);

  return (
    <main className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-3">
          <StickyScoreboard points={score} wordsFound={wordsFound} lastWord={lastWord} />
        </div>

        <div className="lg:col-span-9 flex flex-col items-center gap-12">
          {!active && countdown === null ? (
            <button className="px-16 py-4 bg-primary text-on-primary font-headline font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20 text-lg" onClick={start} type="button">
              Start
            </button>
          ) : null}
          {countdown !== null ? <p className="font-headline font-extrabold text-7xl text-primary">{countdown}</p> : null}

          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
              <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                <circle className="text-outline/20" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeWidth="6"></circle>
                <circle className="text-primary transition-all duration-1000" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeDasharray="377" strokeDashoffset={strokeDashoffset} strokeWidth="6"></circle>
              </svg>
              <div className="relative z-10 flex flex-col items-center justify-center gap-1 px-1 text-center">
                <span className="text-[11px] font-label uppercase tracking-[0.2em] text-on-surface-variant">Timer</span>
                <span className="font-headline text-3xl font-bold tabular-nums leading-none text-on-surface">{timerLabel}</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl">
            <div className="flex justify-center gap-3 p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl">
              {slotLetters.map((ch, idx) => (
                <div key={idx} className="w-16 h-20 bg-surface-container rounded-lg flex items-center justify-center border-b-4 border-surface-container-highest shadow-inner">
                  <span className="text-primary font-headline font-bold text-3xl letter-pop">{ch}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-4">
            {letterButtons.map((letter, idx) => (
              <button key={`${letter}-${idx}`} className="relative w-20 h-20 bg-secondary flex items-center justify-center rounded-xl shadow-[0_8px_0_#b59a6d] hover:shadow-[0_4px_0_#b59a6d] hover:translate-y-[4px] active:translate-y-[8px] active:shadow-none transition-all duration-100 group" type="button" onClick={() => typeChar(letter.toLowerCase())}>
                <div className="absolute inset-0 grain-overlay rounded-xl"></div>
                <span className="text-on-secondary font-headline font-extrabold text-3xl">{letter}</span>
              </button>
            ))}
          </div>

          <div className="flex w-full flex-wrap justify-center gap-4 sm:gap-6">
            <button
              className="flex min-w-[140px] flex-col items-center gap-0.5 rounded-xl bg-surface-container-high px-8 py-4 font-headline text-lg font-bold text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              type="button"
              onClick={shuffleRack}
            >
              <span>Shuffle</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/85">Shift</span>
            </button>
            <button
              className="flex min-w-[160px] flex-col items-center gap-0.5 rounded-xl bg-primary px-10 py-4 font-headline text-lg font-bold text-on-primary shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
              type="button"
              onClick={() => void submit()}
            >
              <span>Submit</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-primary/80">Enter</span>
            </button>
            <button
              className="flex min-w-[140px] flex-col items-center gap-0.5 rounded-xl bg-surface-container-low px-8 py-4 font-headline text-lg font-bold text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
              type="button"
              onClick={clearWord}
            >
              <span>Clear</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/80">Esc</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/solo/page.tsx
git commit -m "feat: solo page - letter button clicks, timer ring, navigate to results on complete"
```

---

### Task 7: Match page — auto-navigate to results after round finalizes

**Files:**
- Modify: `src/app/match/[lobbyId]/page.tsx`

- [ ] **Step 1: Add a ref to track whether we've seen an active round**

At the top of `src/app/match/[lobbyId]/page.tsx`, update the React import from:
```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
```
to:
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
```

After the existing state declarations (around line 54), add:
```typescript
const hasSeenActiveRound = useRef(false);
```

- [ ] **Step 2: Set the ref when an active round is detected**

Add this `useEffect` after the existing `useEffect` that sets `displayRack` (around line 124):

```typescript
useEffect(() => {
  if (activeRound) {
    hasSeenActiveRound.current = true;
  }
}, [activeRound]);
```

- [ ] **Step 3: Add navigation effect when round completes**

Add this `useEffect` right after the one added in Step 2:

```typescript
useEffect(() => {
  if (hasSeenActiveRound.current && state?.round?.status === "complete") {
    router.push(`/results?lobbyId=${lobbyId}`);
  }
}, [state?.round?.status, lobbyId, router]);
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/match/[lobbyId]/page.tsx
git commit -m "feat: match page - auto-navigate to results after round finalizes"
```

---

### Task 8: Results page — real data, missed words, reveal toggle, play again

**Files:**
- Modify: `src/app/results/page.tsx`

- [ ] **Step 1: Replace the results page**

Replace the entire content of `src/app/results/page.tsx`:

```typescript
"use client";

// Swagrams — post-match results

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { lobbyApi, type LobbySnapshot } from "@/lib/multiplayer/api";
import { CURATED_ANSWERS } from "@/lib/words/pools";

const SOLO_STORAGE_KEY = "swagrams_solo_result";

type SoloResult = {
  rack: string;
  score: number;
  words: string[];
};

function computeMissedWords(rack: string, submittedWords: string[]): string[] {
  const key = rack.split("").sort().join("");
  const curated = CURATED_ANSWERS.get(key) ?? new Set<string>();
  const submitted = new Set(submittedWords.map((w) => w.toLowerCase()));
  return [...curated].filter((w) => !submitted.has(w));
}

function longestWord(words: string[]): string {
  if (!words.length) return "—";
  return words.reduce((best, w) => (w.length > best.length ? w : best), "");
}

function ResultsInner() {
  const search = useSearchParams();
  const router = useRouter();
  const lobbyId = search.get("lobbyId");

  const [mpState, setMpState] = useState<LobbySnapshot | null>(null);
  const [soloResult, setSoloResult] = useState<SoloResult | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (lobbyId) {
      lobbyApi.state(lobbyId).then(setMpState).catch(() => undefined);
      return;
    }
    const raw = sessionStorage.getItem(SOLO_STORAGE_KEY);
    if (raw) {
      try {
        setSoloResult(JSON.parse(raw) as SoloResult);
      } catch {
        // malformed storage — ignore
      }
    }
  }, [lobbyId]);

  const isSolo = !lobbyId;

  const finalScore = isSolo
    ? (soloResult?.score ?? 0)
    : (mpState?.players?.length
        ? Math.max(...mpState.players.map((p) => p.score))
        : 0);

  const submittedWords: string[] = isSolo
    ? (soloResult?.words ?? [])
    : (mpState?.submissions?.map((s) => s.word) ?? []);

  const rack: string = isSolo
    ? (soloResult?.rack ?? "")
    : (mpState?.round?.rack ?? "");

  const missedWords = rack ? computeMissedWords(rack, submittedWords) : [];
  const longest = longestWord(submittedWords);

  const handlePlayAgain = () => {
    if (isSolo) {
      sessionStorage.removeItem(SOLO_STORAGE_KEY);
      router.push("/solo");
    } else {
      router.push(`/match/${lobbyId}`);
    }
  };

  return (
    <main className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <section className="flex flex-col items-center gap-2 text-center">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-on-surface-variant/80">Swagrams</p>
        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary">Well Played</h1>
        <p className="font-body text-lg text-on-surface-variant">The study session is complete.</p>
      </section>

      <div className="flex flex-col gap-6 items-center">
        <div className="w-full max-w-2xl bg-secondary rounded-xl p-8 study-shadow wood-grain relative overflow-hidden group">
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-on-secondary font-headline font-bold uppercase tracking-widest text-xs opacity-70">Final Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-on-secondary font-headline font-extrabold text-7xl">{finalScore}</span>
              <span className="text-on-secondary font-body font-medium text-xl opacity-60">pts</span>
            </div>
          </div>
          <div className="mt-8 flex gap-12 relative z-10">
            <div className="flex flex-col">
              <span className="text-on-secondary font-headline font-bold text-xs opacity-60">Words Found</span>
              <span className="text-on-secondary font-headline font-bold text-2xl">{submittedWords.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-secondary font-headline font-bold text-xs opacity-60">Longest Word</span>
              <span className="text-on-secondary font-headline font-bold text-2xl">{longest.toUpperCase()}</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]" data-icon="auto_stories">auto_stories</span>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <div className="bg-tertiary-fixed rounded-lg p-8 study-shadow transform -rotate-1 relative border-t-8 border-error/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-error rounded-full shadow-inner border-2 border-on-error/10"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-on-tertiary-fixed font-headline font-bold text-xl">Missed Words</h2>
              <button
                className="flex items-center gap-2 bg-on-tertiary-fixed/5 px-4 py-2 rounded-lg hover:bg-on-tertiary-fixed/10 transition-colors"
                type="button"
                onClick={() => setRevealed((v) => !v)}
              >
                <span className="material-symbols-outlined text-on-tertiary-fixed text-sm" data-icon="visibility">visibility</span>
                <span className="text-on-tertiary-fixed font-headline font-bold text-sm">
                  {revealed ? "Hide Missed Words" : "Reveal Missed Words"}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {missedWords.length === 0 && !revealed ? (
                <p className="col-span-full text-on-tertiary-fixed/50 font-body text-sm italic">
                  {rack ? "You found them all!" : "No data available."}
                </p>
              ) : null}
              {missedWords.map((word, idx) => (
                <div
                  key={`${word}-${idx}`}
                  className="flex items-center gap-2 text-on-tertiary-fixed font-body italic border-b border-on-tertiary-fixed/5 pb-1"
                  style={revealed ? undefined : { filter: "blur(4px)", userSelect: "none" }}
                >
                  <span className="w-1.5 h-1.5 bg-on-tertiary-fixed/20 rounded-full"></span>
                  <span>{word.toUpperCase()}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <button
                className="bg-on-tertiary-fixed text-tertiary-fixed px-10 py-4 rounded-xl font-headline font-extrabold text-lg shadow-lg active:translate-y-1 transition-all hover:bg-on-tertiary-fixed-variant"
                type="button"
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex justify-center items-center gap-8 text-on-surface-variant/40 mt-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" data-icon="history">history</span>
          <span className="font-label text-xs uppercase tracking-tighter">Session Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" data-icon="workspace_premium">workspace_premium</span>
          <span className="font-label text-xs uppercase tracking-tighter">Words Found: {submittedWords.length}</span>
        </div>
      </footer>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="app-wrap">
          <section className="card">Loading...</section>
        </main>
      }
    >
      <ResultsInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat: results page - real data, missed words reveal, play again routing"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npm test` — 8 engine tests pass
- [ ] Solo play: Start → type letters via keyboard and by clicking letter buttons → submit a real word (e.g. "steam" with rack "stream") → score increments; submit "zzz" → rejected; timer ring animates; round ends → redirected to `/results`
- [ ] Results (solo): correct score and word count shown; missed words blurred by default; "Reveal Missed Words" unblurs them; "Play Again" → `/solo`
- [ ] Results (multiplayer): fetch from Supabase, missed words shown, "Play Again" → `/match/<lobbyId>`
- [ ] Dictionary down (disconnect network): submitting valid rack word shows "Could not reach dictionary."
