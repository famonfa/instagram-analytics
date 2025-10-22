"use client";

import { FormEvent, useMemo, useState } from "react";

import { POST_CREATED_EVENT } from "@/lib/events";

type PublishState = "idle" | "submitting" | "success" | "error";

export default function CreatePostForm() {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<PublishState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  const isSubmitting = status === "submitting";

  const isDisabled = useMemo(() => {
    if (isSubmitting) return true;
    return imageUrl.trim().length === 0;
  }, [imageUrl, isSubmitting]);

  const resetForm = () => {
    setImageUrl("");
    setCaption("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!imageUrl) {
      setErrorMessage("Provide an image URL to publish.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage(undefined);

    try {
      const response = await fetch("/api/facebook/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          caption: caption.trim() || undefined,
        }),
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
            ? "Session expired. Reconnect to publish."
            : apiMessage
              ? `Publishing failed. ${apiMessage}`
              : "Publishing failed. Check the image URL and permissions."
        );
        return;
      }

      setStatus("success");
      resetForm();
      window.dispatchEvent(new Event(POST_CREATED_EVENT));
    } catch (error) {
      console.error("Publish failed", error);
      setStatus("error");
      setErrorMessage("Unexpected error while publishing.");
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="mb-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Publish experiment
        </p>
        <h2 className="text-xl font-semibold text-zinc-900">
          Create a new Instagram post
        </h2>
        <p className="text-sm text-zinc-600">
          Provide a publicly accessible image URL and optional caption. We will
          create the media container and publish it immediately through the
          Graph API.
        </p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="image-url"
            className="block text-sm font-medium text-zinc-800"
          >
            Image URL
          </label>
          <input
            id="image-url"
            type="url"
            required
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-[#1877f2] focus:outline-none focus:ring-2 focus:ring-[#1877f2]/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="caption"
            className="block text-sm font-medium text-zinc-800"
          >
            Caption (optional)
          </label>
          <textarea
            id="caption"
            rows={3}
            placeholder="Share a quick description for your followers…"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-[#1877f2] focus:outline-none focus:ring-2 focus:ring-[#1877f2]/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6ad8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Publishing…" : "Publish to Instagram"}
          </button>
          {status === "success" && (
            <span className="text-sm font-medium text-emerald-600">
              Post published! Feed and insights will refresh shortly.
            </span>
          )}
        </div>

        {status === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <p className="text-xs text-zinc-500">
          Make sure the image is hosted over HTTPS and publicly reachable. The
          Instagram Graph API downloads the asset directly from the provided
          URL.
        </p>
      </form>
    </section>
  );
}
