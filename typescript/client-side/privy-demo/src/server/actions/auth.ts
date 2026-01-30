"use server";

import type { User } from "@otim/utils/schemas";
import type { VRS } from "@otim/utils/schemas";

import { createServerAPIClient } from "../api";
import { clearSessionToken, setSessionToken } from "../session";

/**
 * Login result returned from the server action.
 */
export interface LoginResult {
  /** JWT authorization token */
  authorization: string;
  /** Authenticated user data */
  user: User;
}

/**
 * Authenticates a user using Sign-In With Ethereum (SIWE).
 *
 * This server action handles the API call to the Otim authentication endpoint.
 * The SIWE message must be signed client-side before calling this action.
 *
 * The authorization token is stored in an HTTP-only cookie for subsequent
 * authenticated requests from server actions.
 *
 * @param siwe - The SIWE message string
 * @param signature - The VRS signature components
 * @returns The authorization token and user data
 * @throws Error if authentication fails
 */
export async function loginWithSiwe(
  siwe: string,
  signature: VRS,
): Promise<LoginResult> {
  const api = await createServerAPIClient();

  const response = await api.auth.login({
    siwe,
    signature,
  });

  // Store the token in an HTTP-only cookie for server-side access
  await setSessionToken(response.data.authorization);

  return response.data;
}

/**
 * Logs out the current user by clearing the session cookie.
 *
 * This should be called when the user logs out from the client.
 */
export async function logout(): Promise<void> {
  await clearSessionToken();
}
