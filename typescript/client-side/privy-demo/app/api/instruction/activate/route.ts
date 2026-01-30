import type { InstructionActivateResponse } from "@otim/utils/api";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { instructionActivateRequestSchema } from "@otim/utils/api";

import { createServerAPIClient } from "~/server/api";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<InstructionActivateResponse | { error: string }>> {
  try {
    const body = await request.json();

    // Validate request body
    const result = instructionActivateRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: `Invalid request: ${result.error.message}` },
        { status: 400 },
      );
    }

    // Call the Otim API to activate the instruction
    const api = await createServerAPIClient();
    const response = await api.instruction.activate(result.data);

    if (!response.data) {
      return NextResponse.json(
        { error: "Failed to activate instruction" },
        { status: 500 },
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("[API] Failed to activate instruction:", error);
    const message =
      error instanceof Error ? error.message : "Failed to activate instruction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
