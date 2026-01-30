/**
 * Type-safe environment variable access.
 *
 * All environment variables should be accessed through this module
 * to ensure type safety and provide a single source of truth.
 */

import type { OtimEnvironment } from "@otim/utils/server";

export const env = {
  /** Privy application ID */
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,

  /** Current environment (local | sandbox | production) */
  NEXT_PUBLIC_ENVIRONMENT: (process.env.NEXT_PUBLIC_ENVIRONMENT ||
    "sandbox") as OtimEnvironment,
} as const;
