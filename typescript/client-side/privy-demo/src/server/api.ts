import { APIClient, createInstance } from "@otim/utils/api";
import { getOffchainApiUrl } from "@otim/utils/server";

import { env } from "~/env";

import { getSessionToken } from "./session";

/**
 * Creates a server-side API client for making authenticated requests to the Otim API.
 *
 * This should only be used in Server Components or Server Actions.
 * For client-side requests, use the appropriate hooks.
 *
 * The client automatically includes the Authorization header if a session
 * token is present in the HTTP-only cookie.
 */
export async function createServerAPIClient(): Promise<APIClient> {
  const instance = createInstance({
    baseURL: getOffchainApiUrl(env.NEXT_PUBLIC_ENVIRONMENT),
  });

  const token = await getSessionToken();

  if (token) {
    instance.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  return new APIClient({ instance });
}
