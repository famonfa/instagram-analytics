"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { POST_CREATED_EVENT } from "@/lib/events";

type DailyTotals = {
  last7Days: number;
  last28Days: number;
  timeseries: Array<{ date: string; value: number }>;
};

type AccountInsightsResponse = {
  pageName: string;
  instagramBusinessId: string;
  insights: {
    followerCount: number | null;
    dailyTotals: {
      reach?: DailyTotals;
      profile_views?: DailyTotals;
      website_clicks?: DailyTotals;
      accounts_engaged?: DailyTotals;
      total_interactions?: DailyTotals;
      likes?: DailyTotals;
      comments?: DailyTotals;
      shares?: DailyTotals;
      saves?: DailyTotals;
      profile_links_taps?: DailyTotals;
      views?: DailyTotals;
    };
  };
};

type Status = "loading" | "ready" | "error";

const METRIC_LABELS: Record<string, string> = {
  reach: "Reach",
  profile_views: "Profile Views",
  website_clicks: "Website Clicks",
  accounts_engaged: "Accounts Engaged",
  total_interactions: "Total Interactions",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  profile_links_taps: "Profile Link Taps",
  views: "Views",
};

const METRIC_ORDER: Array<
  keyof AccountInsightsResponse["insights"]["dailyTotals"]
> = [
  "reach",
  "views",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
  "profile_views",
  "profile_links_taps",
  "website_clicks",
];

export default function AccountInsightsTable() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [data, setData] = useState<AccountInsightsResponse | null>(null);

  const fetchAccountInsights = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setStatus("loading");
        setErrorMessage(undefined);
      }

      try {
        const response = await fetch("/api/facebook/account/insights", {
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
              ? "Session expired. Reconnect to refresh insights."
              : apiMessage
              ? `Unable to load account insights. ${apiMessage}`
              : "Unable to load account insights."
          );
          return;
        }

        const json = (await response.json()) as AccountInsightsResponse;
        setData(json);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load account insights", error);
        setStatus("error");
        setErrorMessage("Unexpected error while loading account insights.");
      }
    },
    []
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAccountInsights();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchAccountInsights]);

  useEffect(() => {
    const handler = () => {
      void fetchAccountInsights({ silent: true });
    };

    window.addEventListener(POST_CREATED_EVENT, handler);
    return () => window.removeEventListener(POST_CREATED_EVENT, handler);
  }, [fetchAccountInsights]);

  const rows = useMemo(() => {
    if (!data?.insights) return [];

    return METRIC_ORDER.flatMap((metric) => {
      const value = data.insights.dailyTotals[metric];
      if (!value) return [];

      return [
        {
          metric,
          label: METRIC_LABELS[metric] ?? metric,
          last7Days: value.last7Days,
          last28Days: value.last28Days,
        },
      ];
    });
  }, [data]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Account insights
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">
            Audience & profile performance
          </h2>
          <p className="text-sm text-zinc-600">
            Totals are aggregated from the Instagram Graph API. We provide 7 and
            28 day snapshots for key account metrics.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => void fetchAccountInsights()}
        >
          Refresh account insights
        </button>
      </header>

      {status === "loading" && (
        <p className="text-sm text-zinc-500">Loading account insights…</p>
      )}

      {status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === "ready" && rows.length === 0 && (
        <p className="text-sm text-zinc-500">
          Instagram did not return insight metrics yet. Try again later.
        </p>
      )}

      {status === "ready" && rows.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-700">
                Total Reach (7d)
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {(
                  data?.insights.dailyTotals.reach?.last7Days ?? 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
              <p className="text-xs uppercase tracking-wide text-purple-700">
                Accounts Engaged (7d)
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {(
                  data?.insights.dailyTotals.accounts_engaged?.last7Days ?? 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">
                Total Interactions (7d)
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                {(
                  data?.insights.dailyTotals.total_interactions?.last7Days ?? 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                Profile Views (7d)
              </p>
              <p className="text-2xl font-bold text-amber-900">
                {(
                  data?.insights.dailyTotals.profile_views?.last7Days ?? 0
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                    Metric
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                    Last 7 days
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                    Last 28 days
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row) => (
                  <tr key={row.metric} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-800">{row.label}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {row.last7Days.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {row.last28Days.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Current Followers
              </p>
              <p className="text-3xl font-bold text-zinc-900">
                {data?.insights.followerCount?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500 max-w-md">
              <p>
                Account insights aggregated over 7 and 28 day periods using{" "}
                <code className="rounded bg-zinc-100 px-1">
                  metric_type=total_value
                </code>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
