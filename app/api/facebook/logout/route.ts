import { NextResponse } from "next/server";

import { clearPendingSessionCookie, clearSessionCookie } from "@/lib/facebookSession";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  clearPendingSessionCookie(response);
  return response;
}
