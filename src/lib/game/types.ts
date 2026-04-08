/** Swagrams — shared game types */

export type Difficulty = "easy" | "hard";

export type RoundState = {
  rack: string;
  difficulty: Difficulty;
  startedAt: string;
  endsAt: string;
  status: "active" | "complete";
};

export type PlayerState = {
  id: string;
  displayName: string;
  score: number;
  isReady: boolean;
  connected: boolean;
};
