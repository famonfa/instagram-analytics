import { NextRequest, NextResponse } from "next/server";

import {
  clearStateCookie,
  clearSessionCookie,
  clearPendingSessionCookie,
  readStateFromCookies,
  withSessionCookie,
  withPendingSessionCookie,
  FacebookPageOption,
} from "@/lib/facebookSession";
import { resolveRequestOrigin } from "@/lib/requestOrigin";

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
  const origin = resolveRequestOrigin(request);
  const defaultRedirect = new URL("/auth0", origin).toString();
  const configuredRedirect = process.env.FACEBOOK_REDIRECT_URI;
  let redirectUri = defaultRedirect;

  if (configuredRedirect) {
    try {
      const redirectUrl = new URL(configuredRedirect, origin);
      if (
        origin &&
        !origin.includes("localhost") &&
        redirectUrl.host.includes("localhost")
      ) {
        redirectUri = defaultRedirect;
      } else {
        redirectUri = redirectUrl.toString();
      }
    } catch (error) {
      console.warn(
        "Invalid FACEBOOK_REDIRECT_URI value, falling back to default",
        configuredRedirect,
        error
      );
    }
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const storedState = await readStateFromCookies(request.cookies);

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${origin}/?error=oauth_state_mismatch`,
      { status: 302 }
    );
  }

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
  const candidatePages: FacebookPageOption[] = accountsJson.data
    .filter((page) => page.instagram_business_account?.id)
    .map((page) => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramBusinessId: page.instagram_business_account!.id,
    }));

  if (candidatePages.length === 0) {
    return NextResponse.redirect(
      `${origin}/?error=no_instagram_account`,
      { status: 302 }
    );
  }

  if (candidatePages.length === 1) {
    const selectedPage = candidatePages[0];
    const session = {
      userAccessToken,
      pageAccessToken: selectedPage.pageAccessToken,
      pageId: selectedPage.pageId,
      pageName: selectedPage.pageName,
      instagramBusinessId: selectedPage.instagramBusinessId,
      expiresAt,
    };

    const response = NextResponse.redirect(`${origin}/?connected=1`, {
      status: 302,
    });

    clearStateCookie(response);
    clearPendingSessionCookie(response);
    withSessionCookie(response, session);

    return response;
  }

  const pendingSession = {
    userAccessToken,
    pages: candidatePages,
    expiresAt,
  };

  const response = NextResponse.redirect(`${origin}/select-page`, {
    status: 302,
  });

  clearStateCookie(response);
  clearSessionCookie(response);
  withPendingSessionCookie(response, pendingSession);

  return response;
}
