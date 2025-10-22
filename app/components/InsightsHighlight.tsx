"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { POST_CREATED_EVENT } from "@/lib/events";

type LeaderboardEntry = {
  position: number;
  id: string;
  caption?: string;
  engagement: number;
  like_count: number;
  comments_count: number;
  timestamp: string;
  permalink: string;
  media_url?: string;
  reach?: number;
  saved?: number;
  shares?: number;
};

type InsightsResponse = {
  pageName: string;
  instagramBusinessId: string;
  totalPosts: number;
  topPost?: LeaderboardEntry & { media_type: string };
  leaderboard: LeaderboardEntry[];
};

type Status = "loading" | "ready" | "error";

export default function InsightsHighlight() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [data, setData] = useState<InsightsResponse | null>(null);

  const fetchInsights = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setStatus("loading");
      setErrorMessage(undefined);
    }

    try {
      const response = await fetch("/api/facebook/insights", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const apiMessage =
          body?.message ??
          body?.facebookError?.message ??
          body?.facebookError?.error_user_msg;

        setStatus("error");
        setErrorMessage(
          body?.error === "not_authenticated"
            ? "Session expired. Reconnect to load insights."
            : apiMessage
            ? `Unable to load insights. ${apiMessage}`
            : "Unable to load insights."
        );
        return;
      }

      const json = (await response.json()) as InsightsResponse;
      setData(json);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load insights", error);
      setStatus("error");
      setErrorMessage("Unexpected error while loading insights.");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchInsights();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchInsights]);

  useEffect(() => {
    const handler = () => {
      void fetchInsights({ silent: true });
    };

    window.addEventListener(POST_CREATED_EVENT, handler);
    return () => window.removeEventListener(POST_CREATED_EVENT, handler);
  }, [fetchInsights]);

  const topPost = useMemo(() => {
    if (!data?.leaderboard?.length) return undefined;
    return data.leaderboard[0];
  }, [data]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Engagement insights
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">
            Most successful post
          </h2>
          <p className="text-sm text-zinc-600">
            We rank posts by engagement (likes + comments) using the latest
            Instagram media data.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => void fetchInsights()}
        >
          Refresh insights
        </button>
      </header>

      {status === "loading" && (
        <p className="text-sm text-zinc-500">Crunching the latest numbers…</p>
      )}

      {status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === "ready" && !topPost && (
        <p className="text-sm text-zinc-500">
          No Instagram posts yet. Publish one to see insights.
        </p>
      )}

      {status === "ready" && topPost && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {topPost.media_url ? (
              <a
                href={topPost.permalink}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square w-full"
              >
                <Image
                  src={topPost.media_url}
                  alt={topPost.caption ?? "Instagram media"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  unoptimized
                />
              </a>
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-zinc-500">
                No preview available
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Rank #1
              </p>
              <h3 className="text-lg font-semibold text-zinc-900">
                {topPost.caption
                  ? topPost.caption.slice(0, 120)
                  : "No caption provided"}
              </h3>
              <p className="text-xs text-zinc-500">
                {new Date(topPost.timestamp).toLocaleString()}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <dt className="text-xs uppercase text-zinc-500">Engagement</dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {topPost.engagement}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <dt className="text-xs uppercase text-zinc-500">Reach</dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {topPost.reach?.toLocaleString() ?? "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <dt className="text-xs uppercase text-zinc-500">Likes</dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {topPost.like_count}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <dt className="text-xs uppercase text-zinc-500">Comments</dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {topPost.comments_count}
                </dd>
              </div>
              {typeof topPost.saved === "number" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <dt className="text-xs uppercase text-zinc-500">Saves</dt>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {topPost.saved}
                  </dd>
                </div>
              )}
              {typeof topPost.shares === "number" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <dt className="text-xs uppercase text-zinc-500">Shares</dt>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {topPost.shares}
                  </dd>
                </div>
              )}
            </dl>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Leaderboard
              </p>
              <ul className="mt-2 space-y-2 text-sm text-zinc-600">
                {data?.leaderboard.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1 hover:border-zinc-200"
                  >
                    <span className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1877f2]/10 text-xs font-semibold text-[#1877f2]">
                        {entry.position}
                      </span>
                      <span className="line-clamp-1 min-w-0">
                        {entry.caption ? entry.caption : "No caption"}
                      </span>
                    </span>
                    <span className="flex flex-col items-end text-xs text-zinc-500 flex-shrink-0">
                      <span>{entry.engagement} eng.</span>
                      {entry.reach && (
                        <span className="text-[10px]">
                          {entry.reach.toLocaleString()} reach
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
