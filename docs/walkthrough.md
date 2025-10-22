# Instagram Insights Prototype Walkthrough

This document explains how the current Next.js prototype handles Facebook OAuth, stores session data, and fetches Instagram media.

## Overview

The app lives in `app/page.tsx` and uses a few API routes and helpers:

1. **Initiate OAuth** → `app/api/facebook/login/route.ts`
2. **Handle callback** → `app/api/facebook/callback/route.ts`
3. **Store tokens in cookies** → `lib/facebookSession.ts`
4. **Graph helpers** → `lib/facebookGraph.ts`
5. **Fetch Instagram media** → `app/api/facebook/posts/route.ts`
6. **Media insights** → `app/api/facebook/media/[mediaId]/insights/route.ts`
7. **Account insights** → `app/api/facebook/account/insights/route.ts`
8. **Publish Instagram media** → `app/api/facebook/publish/route.ts`
9. **Insights ranking** → `app/api/facebook/insights/route.ts`
10. **Disconnect** → `app/api/facebook/logout/route.ts`
11. **UI components** → `app/components/*`

Environment variables (`FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI`) are loaded from `.env.local`.
AI analysis requires `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, default `gpt-4o-mini`).

---

## 1. Home page (`app/page.tsx`)

* Reads the session via `readSessionFromCookies()`.
* Shows a “Continue with Facebook” button when not connected.
* Displays connection state, error toasts, and the Instagram feed when tokens are available.
* Uses Tailwind for styling; `InstagramFeed` renders the media grid.

## 2. OAuth kickoff (`app/api/facebook/login/route.ts`)

* Generates a random `state` token.
* Builds Facebook’s `https://www.facebook.com/v17.0/dialog/oauth` URL with:
  * `client_id` → `FACEBOOK_APP_ID`
  * `redirect_uri` → env value or local default
  * `scope` → `pages_show_list, instagram_basic, instagram_content_publish`
  * `state` for CSRF protection
* Saves the state in an HTTP-only cookie and redirects the browser.

## 3. Callback (`app/api/facebook/callback/route.ts`)

* Validates the `state` parameter against the cookie.
* Exchanges the `code` for a user access token via Facebook’s `/oauth/access_token`.
* Calls `/me/accounts` to find the first Facebook page with an `instagram_business_account`.
* Stores `userAccessToken`, `pageAccessToken`, page metadata, and the Instagram business ID in a session cookie.
* Redirects back to `/` with `?connected=1`.

## 4. Session helpers (`lib/facebookSession.ts`)

* Encodes session objects as base64url JSON.
* Provides `readSessionFromCookies()` which accepts `request.cookies` (Next.js `RequestCookies`) or falls back to `cookies()`.
* Manages the OAuth `state` cookie.
* Adds/clears cookies on responses while respecting `Secure` in production.

## 5. Graph helpers (`lib/facebookGraph.ts`)

* Wraps calls to the Graph API (fetching media, creating a media container, publishing media).
* Throws a `FacebookGraphError` containing the raw response body to aid debugging.
* Ensures all helpers reuse consistent field selection and access tokens.

## 6. Fetching media (`app/api/facebook/posts/route.ts`)

* Reads the stored session; returns `401` if missing.
* Requests `/<instagram_business_id>/media` with fields: `caption`, `media_type`, `media_url`, `timestamp`, `like_count`, `comments_count`, etc.
* Returns the data as JSON for the frontend.

## 7. Media insights (`app/api/facebook/media/[mediaId]/insights/route.ts`)

* Accepts a media ID and optional `type` query (e.g. `IMAGE`, `VIDEO`, `REELS`).
* Uses `fetchMediaInsights()` to request metrics allowed for that media type (reach, impressions, engagement, saves, plus plays/video views where supported).
* Converts the Graph response into a flat map of metric → value for consumption by the UI.

## 8. Account insights (`app/api/facebook/account/insights/route.ts`)

* Aggregates daily-account metrics (`reach`, `impressions`, `profile_views`, `website_clicks`) over 7 and 28 day windows.
* Fetches `follower_count` with `period=lifetime`.
* Returns structured data for tables and charts together with the page metadata.

## 9. Publish media (`app/api/facebook/publish/route.ts`)

* Accepts JSON `{ imageUrl, caption? }`.
* Creates a media container via `/media` and immediately publishes it via `/media_publish`.
* Relies on the stored page access token; returns errors with the upstream response body when available.

## 10. Insights (`app/api/facebook/insights/route.ts`)

* Fetches up to 25 media items and ranks them by a simple engagement score (`likes + comments`).
* Returns the top post and a leaderboard (positions 1–5) including timestamps, captions, and permalinks.

## 11. Disconnect (`app/api/facebook/logout/route.ts`)

* Clears the session cookie and returns `{success: true}`.

## 12. Client components

* `ConnectButton` → simple redirect to `/api/facebook/login`.
* `DisconnectButton` → POST to `/api/facebook/logout`.
* `CreatePostForm` → client-side form that hits `/api/facebook/publish` and dispatches a `instagram-post-created` event.
* `AccountInsightsTable` → fetches `/api/facebook/account/insights`, aggregates 7/28 day totals, and renders a table plus follower count.
* `InstagramFeed` → fetches `/api/facebook/posts`, listens for the publish event, renders a grid of posts with `next/image`, and embeds per-post insights via `PostInsights`.
* `PostInsights` → fetches `/api/facebook/media/[mediaId]/insights` for each post to surface reach/impressions/engagement/etc.
* `InsightsHighlight` → calls `/api/facebook/insights`, listens for the publish event, and highlights the top-engagement post plus a leaderboard.
* `AiInsightsPanel` → triggers `/api/insights/analysis`, calling OpenAI to summarize why a post won and suggests next actions. Resets automatically after publishing new content.

---

## Running locally

Create `.env.local`:

```bash
FACEBOOK_APP_ID=2249611485517192
FACEBOOK_APP_SECRET=8eff089e8f92cbc24b8d8706069a1c88
# For localhost testing, add this URI to your Facebook app settings:
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/facebook/callback
# Optional: AI analysis
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

Start the app:

```bash
pnpm dev
```

Then visit `http://localhost:3000`, click “Continue with Facebook”, approve the scopes, and you’ll land back on the prototype with the Instagram feed loaded.

For production, change `FACEBOOK_REDIRECT_URI` to `https://www.avocadopos.com/auth0` and ensure that redirect URI is registered in the Facebook app.
