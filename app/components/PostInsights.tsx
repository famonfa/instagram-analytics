"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { POST_CREATED_EVENT } from "@/lib/events";

type MediaInsightsResponse = {
  mediaId: string;
  mediaType?: string;
  insights: Record<string, number>;
};

type Status = "idle" | "loading" | "error" | "ready";

type PostInsightsProps = {
  mediaId: string;
  mediaType?: string;
};

const METRIC_LABELS: Record<string, string> = {
  reach: "Reach",
  saved: "Saves",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  total_interactions: "Total Interactions",
  follows: "New Follows",
  profile_visits: "Profile Visits",
  profile_activity: "Profile Actions",
  ig_reels_avg_watch_time: "Avg Watch Time",
  ig_reels_video_view_total_time: "Total Watch Time",
};

const METRIC_ORDER = [
  "reach",
  "views",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saved",
  "follows",
  "profile_visits",
  "profile_activity",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
] as const;

export default function PostInsights({
  mediaId,
  mediaType,
}: PostInsightsProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [insights, setInsights] = useState<Record<string, number>>({});

  const fetchInsights = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);

    try {
      const query = mediaType ? `?type=${encodeURIComponent(mediaType)}` : "";
      const response = await fetch(
        `/api/facebook/media/${mediaId}/insights${query}`,
        { method: "GET", cache: "no-store" }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const apiMessage =
          body?.message ??
          body?.facebookError?.message ??
          body?.facebookError?.error_user_msg;

        setStatus("error");
        setErrorMessage(
          body?.error === "not_authenticated"
            ? "Session expired. Reconnect to view insights."
            : apiMessage
            ? `Unable to load insights. ${apiMessage}`
            : "Unable to load insights."
        );
        return;
      }

      const json = (await response.json()) as MediaInsightsResponse;
      setInsights(json.insights ?? {});
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load media insights", error);
      setStatus("error");
      setErrorMessage("Unexpected error while loading insights.");
    }
  }, [mediaId, mediaType]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchInsights();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchInsights]);

  useEffect(() => {
    const handler = () => {
      void fetchInsights();
    };

    window.addEventListener(POST_CREATED_EVENT, handler);
    return () => window.removeEventListener(POST_CREATED_EVENT, handler);
  }, [fetchInsights]);

  const orderedMetrics = useMemo(() => {
    return METRIC_ORDER.filter((metric) => metric in insights);
  }, [insights]);

  if (status === "loading" && orderedMetrics.length === 0) {
    return <p className="text-xs text-zinc-500">Loading engagement metrics…</p>;
  }

  if (status === "error" && orderedMetrics.length === 0) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (orderedMetrics.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        No insights available yet for this media.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
      {orderedMetrics.map((metric) => {
        const value = insights[metric];
        const isTimeMetric = metric.includes("watch_time");
        const displayValue =
          isTimeMetric && typeof value === "number"
            ? `${Math.floor(value / 60)}m ${value % 60}s`
            : value?.toLocaleString() ?? "—";

        return (
          <div
            key={metric}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5"
          >
            <p className="font-medium text-zinc-700">
              {METRIC_LABELS[metric] ?? metric}
            </p>
            <p className="text-sm text-zinc-900">{displayValue}</p>
          </div>
        );
      })}
    </div>
  );
}
