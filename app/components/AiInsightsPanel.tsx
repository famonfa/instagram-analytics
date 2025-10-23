"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { POST_CREATED_EVENT } from "@/lib/events";

type Status = "idle" | "loading" | "ready" | "error";

type AnalysisResponse = {
  success: boolean;
  model: string;
  summary: string;
  analyzedPosts: number;
};

export default function AiInsightsPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();

  const runAnalysis = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);

    try {
      const response = await fetch("/api/insights/analysis", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(
          body?.error === "not_authenticated"
            ? "Session expired. Reconnect with Facebook to run AI analysis."
            : body?.message ??
                "Unable to generate AI insights right now. Try again later."
        );
        return;
      }

      const body = (await response.json()) as AnalysisResponse;
      setAnalysis(body);
      setStatus("ready");
    } catch (error) {
      console.error("AI analysis failed", error);
      setStatus("error");
      setErrorMessage("Unexpected error while generating AI analysis.");
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setAnalysis(null);
      setStatus("idle");
    };

    window.addEventListener(POST_CREATED_EVENT, handler);
    return () => window.removeEventListener(POST_CREATED_EVENT, handler);
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            AI spotlight
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">
            Strategic breakdown of top content
          </h2>
          <p className="text-sm text-zinc-600">
            We review the latest high-performing posts, highlight the strongest
            one, explain why it resonated, and provide tactical recommendations.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => void runAnalysis()}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Analyzing…" : "Run AI analysis"}
        </button>
      </header>

      {status === "idle" && (
        <p className="text-sm text-zinc-500">
          Click “Run AI analysis” to review the latest Instagram performance.
        </p>
      )}

      {status === "loading" && (
        <p className="text-sm text-zinc-500">
          Summarizing posts and generating recommendations…
        </p>
      )}

      {status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === "ready" && analysis && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500">
            Model:{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              {analysis.model}
            </code>{" "}
            · Reviewed posts: {analysis.analyzedPosts}
          </div>
          <div className="prose prose-sm prose-zinc max-w-none prose-headings:text-zinc-800 prose-strong:text-zinc-900 prose-p:text-zinc-700 prose-li:text-zinc-700">
            <ReactMarkdown
              components={{
                img: (props) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    {...props}
                    alt={props.alt || "Post thumbnail"}
                    className="max-w-xs rounded-lg border border-zinc-200 shadow-sm"
                    loading="lazy"
                  />
                ),
                a: (props) => (
                  <a
                    {...props}
                    className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-400"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                h3: (props) => (
                  <h3 {...props} className="text-lg font-semibold text-zinc-800 mt-6 mb-3 border-b border-zinc-200 pb-2" />
                ),
                ul: (props) => (
                  <ul {...props} className="space-y-2 ml-4" />
                ),
                li: (props) => (
                  <li {...props} className="text-zinc-700 leading-relaxed" />
                ),
                p: (props) => (
                  <p {...props} className="text-zinc-700 leading-relaxed mb-4" />
                ),
              }}
            >
              {analysis.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}
