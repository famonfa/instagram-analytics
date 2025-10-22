import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import {
  FacebookGraphError,
  createInstagramMediaContainer,
  publishInstagramMedia,
} from "@/lib/facebookGraph";

type PublishRequest = {
  imageUrl?: string;
  caption?: string;
};

export async function POST(request: NextRequest) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  let body: PublishRequest;

  try {
    body = (await request.json()) as PublishRequest;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected JSON payload" },
      { status: 400 }
    );
  }

  if (!body.imageUrl) {
    return NextResponse.json(
      { error: "missing_image_url", message: "Image URL is required" },
      { status: 400 }
    );
  }

  try {
    const { creationId } = await createInstagramMediaContainer(session, {
      imageUrl: body.imageUrl,
      caption: body.caption,
    });
    const publishResult = await publishInstagramMedia(session, creationId);

    return NextResponse.json({
      success: true,
      creationId,
      mediaId: publishResult.id,
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

      console.error("[facebook/publish] Graph error", {
        message: error.message,
        payload: fbError,
        body: error.responseBody,
      });

      return NextResponse.json(
        {
          error: "publish_failed",
          message: error.message,
          facebookError: fbError,
          details: error.responseBody,
        },
        { status: error.status ?? 502 }
      );
    }

    return NextResponse.json(
      {
        error: "publish_failed",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
