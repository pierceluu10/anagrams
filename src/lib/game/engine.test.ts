/** Swagrams — engine tests */

import { afterEach, describe, expect, it, vi } from "vitest";
import { canBuildFromRack, rackIndicesForTypedWord, scoreWord, validateSubmission } from "@/lib/game/engine";

describe("game engine", () => {
  afterEach(() => vi.restoreAllMocks());

  it("validates letters against rack", () => {
    expect(canBuildFromRack("steam", "stream")).toBe(true);
    expect(canBuildFromRack("streak", "stream")).toBe(false);
  });

  it("scores by word length", () => {
    expect(scoreWord("cat")).toBe(100);
    expect(scoreWord("tame")).toBe(400);
    expect(scoreWord("steam")).toBe(1200);
    expect(scoreWord("stream")).toBe(2000);
  });

  it("assigns greedy rack indices for multiset typing order", () => {
    expect(rackIndicesForTypedWord("ab", "baba")).toEqual([1, 0]);
    expect(rackIndicesForTypedWord("", "stream")).toEqual([]);
    expect(rackIndicesForTypedWord("steam", "stream").length).toBe(5);
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
      expect(result.score).toBe(2000);
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
