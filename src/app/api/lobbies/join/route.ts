// Swagrams API — join lobby

import { NextResponse } from "next/server";
import { joinLobby } from "@/lib/supabase/db";

export async function POST(request: Request) {
  try {
    const { code, displayName, sessionId } = await request.json();
    if (!code || !displayName || !sessionId) {
      return NextResponse.json({ error: "code, displayName, and sessionId are required" }, { status: 400 });
    }
    const data = await joinLobby(code, displayName, sessionId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
