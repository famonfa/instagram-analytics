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

        {session ? (
          <div className="space-y-8">
            <InstagramFeed />
            <CreatePostForm />
            <AccountInsightsTable />
            <InsightsHighlight />
            <AiInsightsPanel />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
            Connect a Facebook account above to unlock the publisher, insights,
            and feed preview.
          </div>
        )}
      </main>
    </div>
  );
}
