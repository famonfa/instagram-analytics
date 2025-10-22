import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import { FacebookGraphError, fetchInstagramMedia } from "@/lib/facebookGraph";

export async function GET(request: NextRequest) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  try {
    const media = await fetchInstagramMedia(session, { limit: 12 });
    return NextResponse.json({
      pageName: session.pageName,
      instagramBusinessId: session.instagramBusinessId,
      data: media,
    });
  } catch (error) {
    if (error instanceof FacebookGraphError) {
      const fbError = error.payload?.error;

      if (fbError?.code === 190) {
        return NextResponse.json(
          {
            error: "not_authenticated",
            message: error.message,
          },
          { status: 401 }
        );
      }

      console.error("[facebook/posts] Graph error", {
        message: error.message,
        payload: fbError,
        body: error.responseBody,
      });

      return NextResponse.json(
        {
          error: "media_fetch_failed",
          message: error.message,
          facebookError: fbError,
          details: error.responseBody,
        },
        { status: error.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "media_fetch_failed", details: String(error) },
      { status: 500 }
    );
  }
}
