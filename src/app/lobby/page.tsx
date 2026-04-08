"use client";

// Swagrams — multiplayer lobby entry

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePageTransition } from "@/components/PageTransition";
import { SessionNameForm } from "@/components/SessionNameForm";
import { lobbyApi } from "@/lib/multiplayer/api";

function getSessionId() {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem("session_id");
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem("session_id", next);
  return next;
}

export default function LobbyPage() {
  const router = useRouter();
  const { navigateHome } = usePageTransition();
  const [step, setStep] = useState<"choose" | "create" | "join">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const sessionId = useMemo(() => getSessionId(), []);

  const handleCreate = async (name: string) => {
    try {
      const data = await lobbyApi.create(name, sessionId);
      localStorage.setItem("player_id", data.playerId);
      router.push(`/match/${data.lobbyId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleJoin = async (name: string) => {
    try {
      const data = await lobbyApi.join(code.toUpperCase(), name, sessionId);
      localStorage.setItem("player_id", data.playerId);
      router.push(`/match/${data.lobbyId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <header className="fixed top-0 z-50 w-full bg-[#14121a]">
        <div className="mx-auto flex max-w-4xl items-center justify-start px-6 py-4">
          <button
            type="button"
            onClick={navigateHome}
            className="font-headline text-xl font-extrabold uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary sm:text-2xl"
          >
            ← Home
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center px-6 pb-12 pt-24">
        <div className="w-full space-y-4 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-2xl">
          <div className="space-y-2 text-center">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Multiplayer</h2>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant">
              Create a new lobby or join with a code
            </p>
          </div>

          {step === "choose" ? (
            <div className="flex w-full flex-col gap-4">
              <button
                className="group relative flex h-auto flex-col items-center gap-3 overflow-hidden rounded-xl bg-[#e0c291] px-8 py-8 text-[#3f2d08] shadow-[0_12px_0_#58441d] transition-all duration-100 active:translate-y-[10px] active:shadow-[0_2px_0_#58441d]"
                type="button"
                onClick={() => setStep("create")}
              >
                <div className="grain-overlay pointer-events-none absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"></div>
                <span className="font-headline text-lg font-extrabold uppercase tracking-wide">Create lobby</span>
              </button>
              <button
                className="group relative flex h-auto flex-col items-center gap-3 overflow-hidden rounded-xl bg-[#cec1e1] px-8 py-8 text-[#352c45] shadow-[0_12px_0_#4b425c] transition-all duration-100 active:translate-y-[10px] active:shadow-[0_2px_0_#4b425c]"
                type="button"
                onClick={() => setStep("join")}
              >
                <div className="grain-overlay pointer-events-none absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"></div>
                <span className="font-headline text-lg font-extrabold uppercase tracking-wide">Join lobby</span>
              </button>
            </div>
          ) : null}

          {step === "create" ? (
            <div className="space-y-4 border-t border-outline-variant/20 pt-3">
              <SessionNameForm onSubmit={handleCreate} buttonLabel="Create" />
              <button
                className="w-full font-label text-xs uppercase tracking-wider text-outline transition-colors hover:text-on-surface-variant"
                type="button"
                onClick={() => {
                  setStep("choose");
                  setError("");
                }}
              >
                ← Back
              </button>
            </div>
          ) : null}

          {step === "join" ? (
            <div className="space-y-4 border-t border-outline-variant/20 pt-3">
              <div className="stack">
                <label className="subtle text-left text-xs uppercase tracking-wider" htmlFor="lobby-code">
                  Lobby code
                </label>
                <input
                  id="lobby-code"
                  className="rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 font-headline text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="ABCDEF"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  aria-label="Lobby code"
                />
              </div>
              <SessionNameForm onSubmit={handleJoin} buttonLabel="Join lobby" />
              <button
                className="w-full font-label text-xs uppercase tracking-wider text-outline transition-colors hover:text-on-surface-variant"
                type="button"
                onClick={() => {
                  setStep("choose");
                  setError("");
                }}
              >
                ← Back
              </button>
            </div>
          ) : null}

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        </div>
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[120px]"></div>
    </div>
  );
}
