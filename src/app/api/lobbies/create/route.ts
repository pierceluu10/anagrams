// Swagrams API — create lobby

import { NextResponse } from "next/server";
import { createLobby } from "@/lib/supabase/db";

export async function POST(request: Request) {
  try {
    const { displayName, sessionId } = await request.json();
    if (!displayName || !sessionId) {
      return NextResponse.json({ error: "displayName and sessionId are required" }, { status: 400 });
    }
    const data = await createLobby(displayName, sessionId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
