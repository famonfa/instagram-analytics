import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // Forward all query parameters (code, state) to the actual callback
  const callbackUrl = new URL("/api/facebook/callback", url.origin);
  callbackUrl.search = url.search;
  
  return NextResponse.redirect(callbackUrl.toString(), { status: 302 });
}
