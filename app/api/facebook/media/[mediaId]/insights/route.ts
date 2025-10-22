import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import {
  FacebookGraphError,
  fetchMediaInsights,
} from "@/lib/facebookGraph";

type Params = {
  mediaId: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  const { mediaId } = await params;

  if (!mediaId) {
    return NextResponse.json(
      { error: "missing_media_id", message: "Media ID is required" },
      { status: 400 }
    );
  }

  const mediaType = request.nextUrl.searchParams.get("type") ?? undefined;

  try {
    const insights = await fetchMediaInsights(session, mediaId, mediaType ?? undefined);
    return NextResponse.json({ mediaId, mediaType, insights });
  } catch (error) {
    if (error instanceof FacebookGraphError) {
      const fbError = error.payload?.error;

      if (fbError?.code === 190) {
        return NextResponse.json(
          { error: "not_authenticated", message: error.message },
          { status: 401 }
        );
      }

      console.error("[facebook/media/insights] Graph error", {
        message: error.message,
        payload: fbError,
        body: error.responseBody,
      });

      return NextResponse.json(
        {
          error: "media_insights_failed",
          message: error.message,
          facebookError: fbError,
          details: error.responseBody,
        },
        { status: error.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "media_insights_failed", details: String(error) },
      { status: 500 }
    );
  }
}
