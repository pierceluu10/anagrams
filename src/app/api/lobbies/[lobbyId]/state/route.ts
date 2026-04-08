// Swagrams API — lobby snapshot

import { NextResponse } from "next/server";
import { getLobbyState } from "@/lib/supabase/db";

export async function GET(_request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const data = await getLobbyState(lobbyId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
