import Link from "next/link";

import AccountInsightsTable from "./components/AccountInsightsTable";
import ConnectButton from "./components/ConnectButton";
import CreatePostForm from "./components/CreatePostForm";
import DisconnectButton from "./components/DisconnectButton";
import InstagramFeed from "./components/InstagramFeed";
import InsightsHighlight from "./components/InsightsHighlight";
import AiInsightsPanel from "./components/AiInsightsPanel";
import { readSessionFromCookies } from "@/lib/facebookSession";

type HomeProps = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_state_mismatch:
    "We could not validate the login response. Please try again.",
  token_exchange_failed:
    "Facebook did not accept the authentication request. Double-check the app credentials.",
  accounts_fetch_failed:
    "We could not list your Facebook pages. Make sure the user granted pages access.",
  no_instagram_account:
    "No Instagram business account is linked to the selected page.",
  media_fetch_failed:
    "We could not fetch Instagram media for this account. Verify its permissions.",
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await readSessionFromCookies();
  const params = await searchParams;
  const errorKey = params?.error;
  const errorMessage =
    (errorKey && ERROR_MESSAGES[errorKey]) ||
    (errorKey ? "Unexpected error. Please try again." : undefined);
  const showConnectedToast = params?.connected === "1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 py-16 sm:px-10 lg:px-0">
        <header className="space-y-4">
          <p className="text-sm font-medium tracking-wide text-[#1877f2]">
            Avocado POS · Instagram Insights
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Connect a Facebook page and explore its Instagram media.
          </h1>
          <p className="max-w-2xl text-base text-zinc-600">
            This experiment walks through the Facebook OAuth flow, stores the
            resulting page token, pulls the latest Instagram posts, and lets you
            publish new media while tracking which post performs best. Start by
            authenticating with a Facebook user that manages an Instagram
            business account linked to a page.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {session ? (
              <>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  Connected as {session.pageName}
                </span>
                <DisconnectButton />
              </>
            ) : (
              <ConnectButton />
            )}
            <Link
              className="text-sm font-semibold text-[#1877f2] hover:underline"
              href="https://developers.facebook.com/docs/instagram-api"
              target="_blank"
            >
              Review API reference
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {showConnectedToast && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Facebook connection complete. Fetching Instagram media…
          </div>
        )}

        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              1. Authenticate with Facebook
            </h2>
            <p className="text-sm text-zinc-600">
              We redirect to the Facebook dialog, request{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                pages_show_list
              </code>
              ,{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                instagram_basic
              </code>{" "}
              and{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                instagram_content_publish
              </code>{" "}
              scopes, then exchange the code for a user access token and page
              token server-side.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              2. Fetch Instagram business media
            </h2>
            <p className="text-sm text-zinc-600">
              After we capture the page token, we hit{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                /{`{instagram_business_id}`}/media
              </code>{" "}
              to pull the latest posts, including captions and basic engagement
              counts.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              3. Publish and rank engagement
            </h2>
            <p className="text-sm text-zinc-600">
              Use the prototype publisher to create Instagram media and review a
              lightweight leaderboard of posts ranked by
              <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5">
                likes + comments
              </code>
              .
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              4. Account health overview
            </h2>
            <p className="text-sm text-zinc-600">
              We combine daily Instagram insights to show follower growth,
              reach, impressions, profile views, and website clicks in an
              account-level table with 7 and 28 day snapshots.
            </p>
          </div>
        </section>

        {session ? (
          <div className="space-y-8">
            <CreatePostForm />
            <AccountInsightsTable />
            <InsightsHighlight />
            <AiInsightsPanel />
            <InstagramFeed />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
            Connect a Facebook account above to unlock the publisher, insights,
            and feed preview.
          </div>
        )}

        <footer className="mt-auto border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          Use environment variables{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            FACEBOOK_APP_ID
          </code>{" "}
          and{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            FACEBOOK_APP_SECRET
          </code>{" "}
          to configure this setup. Optionally override{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            FACEBOOK_REDIRECT_URI
          </code>{" "}
          for production domains.
        </footer>
      </main>
    </div>
  );
}
