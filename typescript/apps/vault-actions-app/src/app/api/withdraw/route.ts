import { NextResponse } from "next/server";
import { withdraw } from "@/lib/otim";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      vaultAddress,
      vaultChainId,
      vaultUnderlyingToken,
      recipientAddress,
      settlementToken,
      settlementChainId,
    } = body;

    if (
      !vaultAddress ||
      !vaultChainId ||
      !vaultUnderlyingToken ||
      !recipientAddress ||
      !settlementToken ||
      !settlementChainId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await withdraw({
      vaultAddress,
      vaultChainId,
      vaultUnderlyingToken,
      recipientAddress,
      settlementToken,
      settlementChainId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
