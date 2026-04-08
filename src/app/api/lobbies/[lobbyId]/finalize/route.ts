// Swagrams API — finalize round

import { NextResponse } from "next/server";
import { finalizeRound } from "@/lib/supabase/db";

export async function POST(_request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const data = await finalizeRound(lobbyId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
