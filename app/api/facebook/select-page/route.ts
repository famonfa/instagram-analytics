import { NextRequest, NextResponse } from "next/server";

import {
  clearPendingSessionCookie,
  readPendingSessionFromCookies,
  withSessionCookie,
} from "@/lib/facebookSession";
import { resolveRequestOrigin } from "@/lib/requestOrigin";

async function extractPageId(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as { pageId?: unknown };
      return typeof json.pageId === "string" ? json.pageId : null;
    } catch {
      return null;
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    const value = formData.get("pageId");
    return typeof value === "string" ? value : null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const origin = resolveRequestOrigin(request);
  const pendingSession = await readPendingSessionFromCookies(request.cookies);

  if (!pendingSession) {
    return NextResponse.redirect(`${origin}/?error=pending_session_expired`, {
      status: 302,
    });
  }

  const pageId = await extractPageId(request);

  if (!pageId) {
    return NextResponse.redirect(`${origin}/?error=page_selection_invalid`, {
      status: 302,
    });
  }

  const selectedPage = pendingSession.pages.find(
    (page) => page.pageId === pageId
  );

  if (!selectedPage) {
    return NextResponse.redirect(`${origin}/?error=page_selection_invalid`, {
      status: 302,
    });
  }

  const session = {
    userAccessToken: pendingSession.userAccessToken,
    pageAccessToken: selectedPage.pageAccessToken,
    pageId: selectedPage.pageId,
    pageName: selectedPage.pageName,
    instagramBusinessId: selectedPage.instagramBusinessId,
    expiresAt: pendingSession.expiresAt,
  };

  const response = NextResponse.redirect(`${origin}/?connected=1`, {
    status: 302,
  });

  clearPendingSessionCookie(response);
  withSessionCookie(response, session);

  return response;
}
