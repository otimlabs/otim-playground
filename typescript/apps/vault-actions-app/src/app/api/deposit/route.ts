import { NextResponse } from "next/server";
import { deposit } from "@/lib/otim";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      vaultAddress,
      vaultChainId,
      vaultUnderlyingToken,
      depositAmount,
      recipientAddress,
      decimals,
    } = body;

    if (
      !vaultAddress ||
      !vaultChainId ||
      !vaultUnderlyingToken ||
      !depositAmount ||
      !recipientAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await deposit({
      vaultAddress,
      vaultChainId,
      vaultUnderlyingToken,
      depositAmount,
      recipientAddress,
      decimals: decimals ?? 6,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
