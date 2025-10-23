"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import PostInsights from "./PostInsights";
import { POST_CREATED_EVENT } from "@/lib/events";

type MediaItem = {
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

type FeedResponse = {
  pageName: string;
  instagramBusinessId: string;
  data: MediaItem[];
};

export default function InstagramFeed() {
  const [posts, setPosts] = useState<MediaItem[]>([]);
  const [pageName, setPageName] = useState<string>();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadPosts = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setStatus("loading");
      setErrorMessage(undefined);
    }

    try {
      const response = await fetch("/api/facebook/posts", {
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
            ? "Your session expired. Please connect again."
            : apiMessage
              ? `Unable to load Instagram media. ${apiMessage}`
              : "Unable to load Instagram media."
        );
        return false;
      }

      const body = (await response.json()) as FeedResponse;
      setPosts(body.data);
      setPageName(body.pageName);
      setStatus("ready");
      return true;
    } catch (error) {
      console.error("Failed to load posts", error);
      setStatus("error");
      setErrorMessage("Unexpected error while loading Instagram media.");
      return false;
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPosts();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPosts]);

  useEffect(() => {
    const handler = () => {
      void loadPosts({ silent: true });
    };

    window.addEventListener(POST_CREATED_EVENT, handler);
    return () => window.removeEventListener(POST_CREATED_EVENT, handler);
  }, [loadPosts]);

  const hasPosts = posts.length > 0;

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Connected Page
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">
            {pageName ?? "Loading..."}
          </h2>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => {
            void loadPosts();
          }}
        >
          Refresh feed
        </button>
      </header>

      {status === "loading" && (
        <p className="text-sm text-zinc-500">Fetching latest posts…</p>
      )}

      {status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === "ready" && !hasPosts && (
        <p className="text-sm text-zinc-500">
          Instagram did not return any media for this business account yet. Try
          publishing a post and refresh.
        </p>
      )}

      {hasPosts && (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => {
            const isVideo =
              post.media_type === "VIDEO" || post.media_type === "REELS";
            const imageUrl = !isVideo
              ? post.media_url ?? post.thumbnail_url
              : post.thumbnail_url ?? undefined;
            const videoUrl = isVideo ? post.media_url : undefined;

            return (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
              >
                {isVideo && videoUrl ? (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block h-56 w-full"
                  >
                    <video
                      src={videoUrl}
                      poster={imageUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      autoPlay
                      loop
                      preload="metadata"
                    />
                  </a>
                ) : imageUrl ? (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block h-56 w-full"
                  >
                    <Image
                      src={imageUrl}
                      alt={post.caption ?? "Instagram media"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized
                    />
                  </a>
                ) : (
                  <div className="flex h-56 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                    No preview available
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {new Date(post.timestamp).toLocaleString()}
                  </p>
                  {post.caption ? (
                    <p className="max-h-24 overflow-hidden text-sm text-zinc-700">
                      {post.caption}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">No caption provided.</p>
                  )}
                  <div className="grid gap-3 text-xs text-zinc-500">
                    <PostInsights mediaId={post.id} mediaType={post.media_type} />
                  </div>
                  <div className="mt-auto flex items-center gap-4 text-xs text-zinc-500">
                    {typeof post.like_count === "number" && (
                      <span>❤️ {post.like_count}</span>
                    )}
                    {typeof post.comments_count === "number" && (
                      <span>💬 {post.comments_count}</span>
                    )}
                    <a
                      className="ml-auto text-xs font-semibold text-[#1877f2] hover:underline"
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Instagram
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
