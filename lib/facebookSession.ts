import { Buffer } from "node:buffer";

import { cookies } from "next/headers";

export type FacebookSession = {
  userAccessToken: string;
  pageAccessToken: string;
  pageId: string;
  pageName: string;
  instagramBusinessId: string;
  expiresAt?: number;
};

export type FacebookPageOption = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessId: string;
};

export type FacebookPendingSession = {
  userAccessToken: string;
  pages: FacebookPageOption[];
  expiresAt?: number;
};

const SESSION_COOKIE = "fb_auth";
const STATE_COOKIE = "fb_oauth_state";
const PENDING_SESSION_COOKIE = "fb_pending_session";

type CookieValue = { value: string };
type CookieStore = {
  get(name: string): CookieValue | undefined;
};

async function resolveCookieStore(
  provided?: CookieStore | null
): Promise<CookieStore | null> {
  if (provided && typeof provided.get === "function") {
    return provided;
  }

  try {
    const store = await cookies();

    if (store && typeof store.get === "function") {
      return store;
    }
  } catch {
    return null;
  }

  return null;
}

export function encodeSession(session: FacebookSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSession(value: string | undefined): FacebookSession | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as FacebookSession;
  } catch {
    return null;
  }
}

export function encodePendingSession(session: FacebookPendingSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodePendingSession(
  value: string | undefined
): FacebookPendingSession | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as FacebookPendingSession;
  } catch {
    return null;
  }
}

export async function readSessionFromCookies(store?: CookieStore | null): Promise<FacebookSession | null> {
  const cookieStore = await resolveCookieStore(store);
  if (!cookieStore) return null;

  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return decodeSession(value);
}

export async function readPendingSessionFromCookies(
  store?: CookieStore | null
): Promise<FacebookPendingSession | null> {
  const cookieStore = await resolveCookieStore(store);
  if (!cookieStore) return null;

  const value = cookieStore.get(PENDING_SESSION_COOKIE)?.value;
  return decodePendingSession(value);
}

export function clearSessionCookie(response: Response) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; ${attributes.join("; ")}`);
}

export function clearPendingSessionCookie(response: Response) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append(
    "Set-Cookie",
    `${PENDING_SESSION_COOKIE}=; ${attributes.join("; ")}`
  );
}

export function withSessionCookie(response: Response, session: FacebookSession) {
  const value = encodeSession(session);
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${value}; ${attributes.join("; ")}`);
}

export function withPendingSessionCookie(
  response: Response,
  session: FacebookPendingSession
) {
  const value = encodePendingSession(session);
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${10 * 60}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append(
    "Set-Cookie",
    `${PENDING_SESSION_COOKIE}=${value}; ${attributes.join("; ")}`
  );
}

export function withStateCookie(response: Response, state: string) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${10 * 60}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append("Set-Cookie", `${STATE_COOKIE}=${state}; ${attributes.join("; ")}`);
}

export async function readStateFromCookies(store?: CookieStore | null): Promise<string | undefined> {
  const cookieStore = await resolveCookieStore(store);
  return cookieStore?.get(STATE_COOKIE)?.value;
}

export function clearStateCookie(response: Response) {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append("Set-Cookie", `${STATE_COOKIE}=; ${attributes.join("; ")}`);
}
