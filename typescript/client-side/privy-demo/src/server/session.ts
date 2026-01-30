import { cookies } from "next/headers";

/**
 * Cookie name for storing the Otim session token.
 */
const SESSION_COOKIE_NAME = "otim-session";

/**
 * Cookie configuration for the session token.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

/**
 * Stores the session token in an HTTP-only cookie.
 *
 * This allows server actions to access the token for authenticated API requests.
 * The cookie is HTTP-only to prevent XSS attacks.
 *
 * @param token - The JWT authorization token from SIWE login
 */
export async function setSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Retrieves the session token from the HTTP-only cookie.
 *
 * Used by server actions to authenticate requests to the Otim API.
 *
 * @returns The session token if present, null otherwise
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Clears the session token cookie.
 *
 * Should be called when the user logs out.
 */
export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
