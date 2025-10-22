import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import {
  FacebookGraphError,
  InstagramMedia,
  fetchInstagramMedia,
} from "@/lib/facebookGraph";

type RankedMedia = InstagramMedia & {
  engagement: number;
};

function rankMediaByEngagement(media: InstagramMedia[]): RankedMedia[] {
  return media
    .map((item) => {
      const likes = item.like_count ?? 0;
      const comments = item.comments_count ?? 0;
      return {
        ...item,
        engagement: likes + comments,
      };
    })
    .sort((a, b) => b.engagement - a.engagement);
}

export async function GET(request: NextRequest) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  try {
    const media = await fetchInstagramMedia(session, { limit: 25 });
    
    if (!media || media.length === 0) {
      return NextResponse.json({
        pageName: session.pageName,
        instagramBusinessId: session.instagramBusinessId,
        totalPosts: 0,
        topPost: undefined,
        leaderboard: [],
      });
    }
    
    const ranked = rankMediaByEngagement(media);
    const topPost = ranked[0];

    return NextResponse.json({
      pageName: session.pageName,
      instagramBusinessId: session.instagramBusinessId,
      totalPosts: ranked.length,
      topPost,
      leaderboard: ranked.slice(0, 5).map((item, index) => ({
        position: index + 1,
        id: item.id,
        caption: item.caption,
        engagement: item.engagement,
        like_count: item.like_count ?? 0,
        comments_count: item.comments_count ?? 0,
        timestamp: item.timestamp,
        permalink: item.permalink,
        media_url: item.media_url ?? item.thumbnail_url,
      })),
    });
  } catch (error) {
    if (error instanceof FacebookGraphError) {
      const fbError = error.payload?.error;

      if (fbError?.code === 190) {
        return NextResponse.json(
          { error: "not_authenticated", message: error.message },
          { status: 401 }
        );
      }

      console.error("[facebook/insights] Graph error", {
        message: error.message,
        payload: fbError,
        body: error.responseBody,
        status: error.status,
      });

      return NextResponse.json(
        {
          error: "insights_failed",
          message: error.message,
          facebookError: fbError,
          details: error.responseBody,
        },
        { status: error.status ?? 502 }
      );
    }

    console.error("[facebook/insights] Unexpected error", error);
    return NextResponse.json(
      { error: "insights_failed", details: String(error) },
      { status: 500 }
    );
  }
}
