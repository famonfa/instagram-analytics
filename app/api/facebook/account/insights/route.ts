import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import {
  AccountInsights,
  FacebookGraphError,
  fetchAccountInsights,
} from "@/lib/facebookGraph";

export async function GET(request: NextRequest) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const periodDays = daysParam ? Number.parseInt(daysParam, 10) : undefined;

  try {
    const insights: AccountInsights = await fetchAccountInsights(session, {
      periodDays,
    });

    return NextResponse.json({
      pageName: session.pageName,
      instagramBusinessId: session.instagramBusinessId,
      insights,
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

      console.error("[facebook/account/insights] Graph error", {
        message: error.message,
        payload: fbError,
        body: error.responseBody,
      });

      return NextResponse.json(
        {
          error: "account_insights_failed",
          message: error.message,
          facebookError: fbError,
          details: error.responseBody,
        },
        { status: error.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "account_insights_failed", details: String(error) },
      { status: 500 }
    );
  }
}
