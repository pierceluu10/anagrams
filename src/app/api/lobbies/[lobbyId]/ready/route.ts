// Swagrams API — player ready

import { NextResponse } from "next/server";
import { toggleReady } from "@/lib/supabase/db";

export async function POST(request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const { playerId, ready } = await request.json();
    await toggleReady(lobbyId, playerId, !!ready);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
