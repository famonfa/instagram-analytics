import Link from "next/link";
import { redirect } from "next/navigation";

import { readPendingSessionFromCookies } from "@/lib/facebookSession";

export default async function SelectPage() {
  const pendingSession = await readPendingSessionFromCookies();

  if (!pendingSession || pendingSession.pages.length === 0) {
    redirect("/?error=pending_session_expired");
  }

  if (pendingSession.pages.length === 1) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16 sm:px-10 lg:px-0">
        <header className="space-y-4">
          <p className="text-sm font-medium tracking-wide text-[#1877f2]">
            Avocado POS · Instagram Insights
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose a Facebook Page
          </h1>
          <p className="max-w-2xl text-base text-zinc-600">
            This Facebook user manages multiple pages with Instagram business
            accounts. Select the page you would like to use for insights and
            publishing.
          </p>
        </header>

        <div className="space-y-4">
          {pendingSession.pages.map((page) => (
            <form
              key={page.pageId}
              action="/api/facebook/select-page"
              method="POST"
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <input type="hidden" name="pageId" value={page.pageId} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {page.pageName}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Instagram Business ID: {page.instagramBusinessId}
                  </p>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6ad8]"
                >
                  Use this page
                </button>
              </div>
            </form>
          ))}
        </div>

        <div className="text-sm text-zinc-500">
          <p>
            Need to switch Facebook users?{" "}
            <Link
              href="/"
              className="font-semibold text-[#1877f2] hover:underline"
            >
              Go back home
            </Link>{" "}
            and disconnect to start again.
          </p>
        </div>
      </main>
    </div>
  );
}
