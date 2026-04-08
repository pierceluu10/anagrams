"use client";

// Swagrams — home (solo / multiplayer entry)

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-16 pt-6">
        <div className="flex w-full flex-col items-stretch gap-5">
          <h1 className="font-headline text-center text-4xl font-bold italic tracking-tighter text-[#cec1e1] sm:text-5xl">
            Swagrams
          </h1>
          <div className="flex w-full flex-col gap-6">
            <button
              className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-[#e0c291] px-8 py-10 text-[#3f2d08] shadow-[0_12px_0_#58441d] transition-all duration-100 active:translate-y-[10px] active:shadow-[0_2px_0_#58441d]"
              type="button"
              onClick={() => router.push("/solo")}
            >
              <div className="absolute inset-0 grain-overlay opacity-5 transition-opacity group-hover:opacity-10"></div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3f2d08]/10">
                <span className="material-symbols-outlined text-4xl" data-icon="person">
                  person
                </span>
              </div>
              <span className="font-headline text-2xl font-extrabold uppercase tracking-wide">Play Solo</span>
            </button>

            <button
              className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-[#cec1e1] px-8 py-10 text-[#352c45] shadow-[0_12px_0_#4b425c] transition-all duration-100 active:translate-y-[10px] active:shadow-[0_2px_0_#4b425c]"
              type="button"
              onClick={() => router.push("/lobby")}
            >
              <div className="absolute inset-0 grain-overlay opacity-5 transition-opacity group-hover:opacity-10"></div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#352c45]/10">
                <span className="material-symbols-outlined text-4xl" data-icon="groups">
                  groups
                </span>
              </div>
              <span className="font-headline text-center text-xl font-extrabold uppercase tracking-wide sm:text-2xl">
                Play with others
              </span>
            </button>
          </div>
        </div>
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[120px]"></div>
    </div>
  );
}
