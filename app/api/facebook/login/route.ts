import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { withStateCookie } from "@/lib/facebookSession";

const DEFAULT_SCOPES =
  "pages_show_list,instagram_basic,instagram_content_publish";

export async function GET(request: Request) {
  const appId = process.env.FACEBOOK_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: "FACEBOOK_APP_ID is not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  
  // Get the correct origin from proxy headers
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;
  
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ??
    `${origin}/auth0`;
  const scopes = process.env.FACEBOOK_SCOPES ?? DEFAULT_SCOPES;

  const authUrl = new URL("https://www.facebook.com/v17.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // authUrl = https://www.facebook.com/v17.0/dialog/oauth?client_id=...&redirect_uri=...&scope=...&response_type=code&state=...

  const response = NextResponse.redirect(authUrl.toString(), { status: 302 });
  withStateCookie(response, state);

  return response;
}
