"use client";

// Swagrams — post-match results

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
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
  const { navigateHome } = usePageTransition();
  const lobbyId = search.get("lobbyId");

  const [mpState, setMpState] = useState<LobbySnapshot | null>(null);
  const [soloResult, setSoloResult] = useState<SoloResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<6 | 5 | 4 | 3>(6);

  useEffect(() => {
    if (lobbyId) {
      lobbyApi.state(lobbyId).then(setMpState).catch(() => undefined);
      return;
    }
    const t = window.setTimeout(() => {
      const raw = sessionStorage.getItem(SOLO_STORAGE_KEY);
      if (raw) {
        try {
          setSoloResult(JSON.parse(raw) as SoloResult);
        } catch {
          // malformed storage — ignore
        }
      }
    }, 0);
    return () => clearTimeout(t);
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
    <main className="mx-auto flex h-screen w-full max-w-5xl flex-col gap-5 overflow-y-auto px-4 pb-6 pt-6">
      <div className="fixed left-0 top-0 z-50 px-6 py-4">
        <button
          type="button"
          onClick={navigateHome}
          className="font-headline text-xl font-extrabold uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary sm:text-2xl"
        >
          ← Home
        </button>
      </div>
      <section className="flex flex-col items-center text-center">
        <h1 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary sm:text-5xl">GG</h1>
      </section>

      <div className="flex flex-col items-center gap-5">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-secondary p-6 study-shadow wood-grain group">
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-on-secondary font-headline font-bold uppercase tracking-widest text-xs opacity-70">Final Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-on-secondary font-headline font-extrabold text-7xl">{finalScore}</span>
              <span className="text-on-secondary font-body font-medium text-xl opacity-60">pts</span>
            </div>
          </div>
          <div className="relative z-10 mt-6 flex gap-10">
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
          <div className="relative -rotate-1 rounded-lg border-t-8 border-error/20 bg-tertiary-fixed p-6 study-shadow">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-error rounded-full shadow-inner border-2 border-on-error/10"></div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-on-tertiary-fixed font-headline font-bold text-xl">Missed Words</h2>
              <button
                className="flex items-center gap-2 bg-on-tertiary-fixed/5 px-4 py-2 rounded-lg hover:bg-on-tertiary-fixed/10 transition-colors"
                type="button"
                onClick={() => setRevealed((v) => !v)}
              >
                <span className="material-symbols-outlined text-on-tertiary-fixed text-sm" data-icon="visibility">visibility</span>
                <span className="text-on-tertiary-fixed font-headline font-bold text-sm">
                  {revealed ? "Hide" : "Reveal"}
                </span>
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              {([6, 5, 4, 3] as const).map((len) => {
                const active = lengthFilter === len;
                const count = missedWords.filter((w) => w.length === len).length;
                return (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setLengthFilter(len)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-headline text-sm font-bold transition-colors ${
                      active
                        ? "bg-on-tertiary-fixed text-tertiary-fixed"
                        : "bg-on-tertiary-fixed/5 text-on-tertiary-fixed hover:bg-on-tertiary-fixed/10"
                    }`}
                  >
                    <span>{len}</span>
                    <span className={`tabular-nums text-xs font-semibold ${active ? "opacity-80" : "opacity-50"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(() => {
                const filtered = missedWords.filter((w) => w.length === lengthFilter);

                if (filtered.length === 0) {
                  return (
                    <p className="col-span-full text-on-tertiary-fixed/50 font-body text-sm italic">
                      {rack ? "You found them all!" : "No data available."}
                    </p>
                  );
                }

                return filtered.map((word, idx) => (
                  <div
                    key={`${word}-${idx}`}
                    className="flex items-center gap-2 text-on-tertiary-fixed font-body italic border-b border-on-tertiary-fixed/5 pb-1"
                    style={revealed ? undefined : { filter: "blur(4px)", userSelect: "none" }}
                  >
                    <span className="w-1.5 h-1.5 bg-on-tertiary-fixed/20 rounded-full"></span>
                    <span>{word.toUpperCase()}</span>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-6 flex justify-center">
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
