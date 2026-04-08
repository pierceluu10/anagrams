// Swagrams API — submit word

import { NextResponse } from "next/server";
import { submitWord } from "@/lib/supabase/db";

export async function POST(request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const { playerId, word } = await request.json();
    if (!playerId || !word) {
      return NextResponse.json({ error: "playerId and word required" }, { status: 400 });
    }
    const data = await submitWord(lobbyId, playerId, word);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
