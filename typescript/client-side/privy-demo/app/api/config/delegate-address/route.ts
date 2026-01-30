import type { GetDelegateAddressResponse } from "@otim/utils/api";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getDelegateAddressSchema } from "@otim/utils/api";

import { createServerAPIClient } from "~/server/api";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<GetDelegateAddressResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get("chainId");

    if (!chainIdParam) {
      return NextResponse.json(
        { error: "chainId is required" },
        { status: 400 },
      );
    }

    const chainId = parseInt(chainIdParam, 10);
    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: "chainId must be a number" },
        { status: 400 },
      );
    }

    // Validate request
    const result = getDelegateAddressSchema.safeParse({ chainId });
    if (!result.success) {
      return NextResponse.json(
        { error: `Invalid request: ${result.error.message}` },
        { status: 400 },
      );
    }

    // Call the Otim API to get the delegate address
    const api = await createServerAPIClient();
    const response = await api.config.getDelegateAddress(result.data);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error?.message ?? "Failed to get delegate address" },
        { status: response.error?.status ?? 500 },
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("[API] Failed to get delegate address:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get delegate address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
