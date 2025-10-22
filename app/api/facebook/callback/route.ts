import { NextRequest, NextResponse } from "next/server";

import {
  clearStateCookie,
  readStateFromCookies,
  withSessionCookie,
} from "@/lib/facebookSession";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type AccountsResponse = {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
};

export async function GET(request: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Facebook app credentials are not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  
  // Get the correct origin from proxy headers
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;
  
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const storedState = await readStateFromCookies(request.cookies);

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${origin}/?error=oauth_state_mismatch`,
      { status: 302 }
    );
  }

  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ??
    `${origin}/auth0`;

  const tokenUrl = new URL("https://graph.facebook.com/v17.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl, { method: "GET" });

  if (!tokenRes.ok) {
    const errorData = await tokenRes.json();
    console.error("Token exchange failed:", errorData);
    return NextResponse.redirect(
      `${origin}/?error=token_exchange_failed`,
      { status: 302 }
    );
  }

  const tokenJson = (await tokenRes.json()) as TokenResponse;
  const userAccessToken = tokenJson.access_token;
  const expiresAt =
    tokenJson.expires_in > 0
      ? Math.floor(Date.now() / 1000) + tokenJson.expires_in
      : undefined;

  const accountsUrl = new URL("https://graph.facebook.com/v17.0/me/accounts");
  accountsUrl.searchParams.set("access_token", userAccessToken);
  accountsUrl.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account"
  );

  const accountsRes = await fetch(accountsUrl, { method: "GET" });

  if (!accountsRes.ok) {
    return NextResponse.redirect(
      `${origin}/?error=accounts_fetch_failed`,
      { status: 302 }
    );
  }

  const accountsJson = (await accountsRes.json()) as AccountsResponse;
  const connectedPage = accountsJson.data.find(
    (page) => page.instagram_business_account?.id
  );
  // todo: the ui should show a seection screen if there are more than one page with ig account

  if (!connectedPage) {
    return NextResponse.redirect(
      `${origin}/?error=no_instagram_account`,
      { status: 302 }
    );
  }

  const session = {
    userAccessToken,
    pageAccessToken: connectedPage.access_token,
    pageId: connectedPage.id,
    pageName: connectedPage.name,
    instagramBusinessId: connectedPage.instagram_business_account!.id,
    expiresAt,
  };

  const response = NextResponse.redirect(`${origin}/?connected=1`, {
    status: 302,
  });

  clearStateCookie(response);
  withSessionCookie(response, session);

  return response;
}
