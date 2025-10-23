import { FacebookSession } from "./facebookSession";

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

type MediaResponse = {
  data: InstagramMedia[];
};

type PublishResponse = {
  id: string;
};

type GraphApiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class FacebookGraphError extends Error {
  responseBody?: string;
  status: number;
  payload?: GraphApiErrorPayload;

  constructor(
    message: string,
    options?: {
      status?: number;
      responseBody?: string;
      payload?: GraphApiErrorPayload;
    }
  ) {
    super(message);
    this.name = "FacebookGraphError";
    this.responseBody = options?.responseBody;
    this.status = options?.status ?? 500;
    this.payload = options?.payload;
  }
}

async function handleGraphError(
  response: Response,
  fallbackMessage: string
): Promise<never> {
  const text = await response.text();
  let payload: GraphApiErrorPayload | undefined;

  try {
    payload = JSON.parse(text) as GraphApiErrorPayload;
  } catch {
    payload = undefined;
  }

  const message =
    payload?.error?.message?.trim().length
      ? payload.error.message
      : fallbackMessage;

  throw new FacebookGraphError(message, {
    status: response.status,
    responseBody: text,
    payload,
  });
}

export async function fetchInstagramMedia(
  session: FacebookSession,
  options?: { limit?: number }
): Promise<InstagramMedia[]> {
  const limit = options?.limit ?? 12;

  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "timestamp",
    "thumbnail_url",
    "like_count",
    "comments_count",
  ];

  const mediaUrl = new URL(
    `https://graph.facebook.com/v17.0/${session.instagramBusinessId}/media`
  );
  mediaUrl.searchParams.set("fields", fields.join(","));
  mediaUrl.searchParams.set("access_token", session.pageAccessToken);
  mediaUrl.searchParams.set("limit", String(limit));

  const response = await fetch(mediaUrl, { method: "GET" });
  if (!response.ok) {
    await handleGraphError(response, "Failed to fetch Instagram media");
  }

  const json = (await response.json()) as MediaResponse;
  return json.data;
}

export async function createInstagramMediaContainer(
  session: FacebookSession,
  params: { imageUrl: string; caption?: string }
): Promise<{ creationId: string }> {
  const formData = new FormData();
  formData.set("image_url", params.imageUrl);
  if (params.caption) {
    formData.set("caption", params.caption);
  }
  formData.set("access_token", session.pageAccessToken);

  const response = await fetch(
    `https://graph.facebook.com/v17.0/${session.instagramBusinessId}/media`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    await handleGraphError(
      response,
      "Failed to create Instagram media container"
    );
  }

  const json = (await response.json()) as { id: string };
  return { creationId: json.id };
}

export async function publishInstagramMedia(
  session: FacebookSession,
  creationId: string
): Promise<PublishResponse> {
  const formData = new FormData();
  formData.set("creation_id", creationId);
  formData.set("access_token", session.pageAccessToken);

  const response = await fetch(
    `https://graph.facebook.com/v17.0/${session.instagramBusinessId}/media_publish`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    await handleGraphError(response, "Failed to publish Instagram media");
  }

  const json = (await response.json()) as PublishResponse;
  return json;
}

export type MediaInsightsMetric =
  | "reach"
  | "saved"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "total_interactions"
  | "follows"
  | "profile_visits"
  | "profile_activity"
  | "ig_reels_avg_watch_time"
  | "ig_reels_video_view_total_time";

type MediaInsightsResponse = {
  data: Array<{
    name: MediaInsightsMetric;
    period: string;
    values: Array<{ value: number | null }>;
    title?: string;
    description?: string;
  }>;
};

export type MediaInsights = Partial<Record<MediaInsightsMetric, number>>;

function metricsForMediaType(
  mediaType: string | undefined
): MediaInsightsMetric[] {
  switch (mediaType) {
    case "VIDEO":
      // Feed videos do not expose profile metrics
      return [
        "reach",
        "saved",
        "views",
        "likes",
        "comments",
        "shares",
        "total_interactions",
      ];
    case "REELS":
      // Reels-specific metrics
      return ["reach", "saved", "views", "likes", "comments", "shares", "total_interactions", "follows", "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"];
    case "STORY":
      // Stories (only available for 24 hours)
      return ["reach", "views", "follows", "profile_visits", "shares", "total_interactions"];
    case "CAROUSEL_ALBUM":
      // Carousel/Album posts
      return ["reach", "saved", "likes", "comments", "shares", "total_interactions", "profile_visits", "profile_activity"];
    case "IMAGE":
    default:
      // Regular image posts
      return ["reach", "saved", "likes", "comments", "shares", "total_interactions", "profile_visits", "profile_activity"];
  }
}

export async function fetchMediaInsights(
  session: FacebookSession,
  mediaId: string,
  mediaType?: string
): Promise<MediaInsights> {
  const metrics = metricsForMediaType(mediaType);

  const url = new URL(`https://graph.facebook.com/v17.0/${mediaId}/insights`);
  url.searchParams.set("metric", metrics.join(","));
  url.searchParams.set("access_token", session.pageAccessToken);

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    await handleGraphError(response, "Failed to fetch media insights");
  }

  const json = (await response.json()) as MediaInsightsResponse;

  return json.data.reduce<MediaInsights>((acc, item) => {
    const value = item.values?.[0]?.value ?? null;
    if (typeof value === "number") {
      acc[item.name] = value;
    }
    return acc;
  }, {} as MediaInsights);
}

type AccountInsightsMetric =
  | "reach"
  | "profile_views"
  | "website_clicks"
  | "follower_count"
  | "online_followers"
  | "accounts_engaged"
  | "total_interactions"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "replies"
  | "follows_and_unfollows"
  | "profile_links_taps"
  | "views";

type AccountInsightsDailyResponse = {
  data: Array<{
    name: AccountInsightsMetric;
    period: string;
    title?: string;
    description?: string;
    total_value?: { value: number };
    values?: Array<{ value: number | Record<string, number>; end_time: string }>;
  }>;
};

export type AccountInsights = {
  followerCount: number | null;
  dailyTotals: Record<
    AccountInsightsMetric,
    {
      last7Days: number;
      last28Days: number;
      timeseries: Array<{ date: string; value: number }>;
    }
  >;
};

type FetchAccountInsightsParams = {
  periodDays?: number;
};

export async function fetchAccountInsights(
  session: FacebookSession,
  params?: FetchAccountInsightsParams
): Promise<AccountInsights> {
  const requestedDays = Number.isFinite(params?.periodDays)
    ? Number(params?.periodDays)
    : 28;
  const daySeconds = 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);
  const clampedRange = Math.min(
    Math.max(requestedDays, 1) * daySeconds,
    30 * daySeconds - 60
  );
  const since = Math.max(until - clampedRange, 0);

  const dailyUrl = new URL(
    `https://graph.facebook.com/v17.0/${session.instagramBusinessId}/insights`
  );
  dailyUrl.searchParams.set(
    "metric",
    [
      "reach",
      "profile_views", 
      "website_clicks",
      "accounts_engaged",
      "total_interactions",
      "likes",
      "comments",
      "shares",
      "saves",
      "profile_links_taps",
      "views"
    ].join(",")
  );
  dailyUrl.searchParams.set("period", "day");
  dailyUrl.searchParams.set("metric_type", "total_value");
  dailyUrl.searchParams.set("access_token", session.pageAccessToken);
  dailyUrl.searchParams.set("since", String(since));
  dailyUrl.searchParams.set("until", String(until));

  const followerUrl = new URL(
    `https://graph.facebook.com/v17.0/${session.instagramBusinessId}`
  );
  followerUrl.searchParams.set("fields", "followers_count");
  followerUrl.searchParams.set("access_token", session.pageAccessToken);

  const [dailyRes, followerRes] = await Promise.all([
    fetch(dailyUrl, { method: "GET" }),
    fetch(followerUrl, { method: "GET" }),
  ]);

  if (!dailyRes.ok) {
    await handleGraphError(dailyRes, "Failed to fetch account insights");
  }

  if (!followerRes.ok) {
    await handleGraphError(followerRes, "Failed to fetch follower count");
  }

  const dailyJson = (await dailyRes.json()) as AccountInsightsDailyResponse;
  const followerJson = (await followerRes.json()) as { followers_count?: number };

  console.log("[Account Insights] Raw API response:", JSON.stringify(dailyJson, null, 2));

  const followerCount = followerJson.followers_count ?? null;

  const dailyTotals =
    dailyJson.data.reduce<AccountInsights["dailyTotals"]>((acc, metric) => {
      // Handle new API format with total_value object
      const totalValue = metric.total_value?.value ?? 0;

      // For now, use total_value for both periods since API returns aggregated totals
      // In the future, we could fetch different time periods separately
      acc[metric.name] = {
        last7Days: totalValue,
        last28Days: totalValue,
        timeseries: [
          {
            date: new Date().toISOString(),
            value: totalValue,
          },
        ],
      };

      return acc;
    }, {} as AccountInsights["dailyTotals"]);

  return {
    followerCount,
    dailyTotals,
  };
}
