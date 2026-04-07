/** Swagrams — word pools (easy/hard racks and valid answers) */

export type WordPoolEntry = {
  rack: string;
  difficulty: "easy" | "hard";
  answers: string[];
};

const easyEntries: WordPoolEntry[] = [
  { rack: "stream", difficulty: "easy", answers: ["stream", "master", "tamers"] },
  { rack: "finder", difficulty: "easy", answers: ["finder", "friend", "redfin"] },
  { rack: "stared", difficulty: "easy", answers: ["stared", "trades", "treads"] },
  { rack: "rescue", difficulty: "easy", answers: ["rescue", "secure", "recuse"] },
  { rack: "retain", difficulty: "easy", answers: ["retain", "retina", "ratine"] },
  { rack: "silent", difficulty: "easy", answers: ["silent", "listen", "enlist", "tinsel", "inlets"] },
  { rack: "singer", difficulty: "easy", answers: ["singer", "resign", "signer"] },
  { rack: "notesd", difficulty: "easy", answers: ["stoned", "toneds"] },
  { rack: "hearts", difficulty: "easy", answers: ["hearts", "earths", "haters"] },
  { rack: "alerts", difficulty: "easy", answers: ["alerts", "staler", "talers", "ratels"] },
  { rack: "admirer", difficulty: "easy", answers: ["admire"] },
  { rack: "flaunt", difficulty: "easy", answers: ["flaunt", "unflat"] }
];

const hardEntries: WordPoolEntry[] = [
  { rack: "acrept", difficulty: "hard", answers: ["pacter", "captre"] },
  { rack: "braced", difficulty: "hard", answers: ["braced", "cabred"] },
  { rack: "cerats", difficulty: "hard", answers: ["caster", "caters", "crates", "reacts", "traces"] },
  { rack: "dorset", difficulty: "hard", answers: ["stored", "sorted", "doters"] },
  { rack: "gainer", difficulty: "hard", answers: ["regain", "earing"] },
  { rack: "lairds", difficulty: "hard", answers: ["lizards", "drails", "liards"] },
  { rack: "mortal", difficulty: "hard", answers: ["mortal", "tumoral"] },
  { rack: "pastel", difficulty: "hard", answers: ["palest", "staple", "plates", "petals"] },
  { rack: "reatch", difficulty: "hard", answers: ["chater", "hectar"] },
  { rack: "souren", difficulty: "hard", answers: ["onures", "senour"] },
  { rack: "tribal", difficulty: "hard", answers: ["ribalt"] },
  { rack: "vacant", difficulty: "hard", answers: ["vacant"] }
];

export const WORD_POOLS = {
  easy: easyEntries,
  hard: hardEntries
};

export const ROUND_SECONDS = 60;

function shuffleString(value: string): string {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function getRandomPoolEntry(): WordPoolEntry {
  const difficulty: "easy" | "hard" = Math.random() > 0.5 ? "hard" : "easy";
  const pool = WORD_POOLS[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function randomizeRack(entry: WordPoolEntry): string {
  const cleanRack = entry.rack.slice(0, 6).toLowerCase();
  return shuffleString(cleanRack);
}

export function buildAnswerMap() {
  const map = new Map<string, Set<string>>();
  [...easyEntries, ...hardEntries].forEach((entry) => {
    const key = entry.rack.slice(0, 6).split("").sort().join("");
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    entry.answers.forEach((answer) => {
      map.get(key)?.add(answer.toLowerCase());
    });
  });
  return map;
}

export const CURATED_ANSWERS = buildAnswerMap();
