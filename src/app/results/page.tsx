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
