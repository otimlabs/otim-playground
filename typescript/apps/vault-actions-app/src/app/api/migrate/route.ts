import { NextResponse } from "next/server";
import { migrate } from "@/lib/otim";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sourceVaultAddress,
      sourceVaultChainId,
      sourceVaultUnderlyingToken,
      destVaultAddress,
      destVaultChainId,
      destVaultUnderlyingToken,
      recipientAddress,
    } = body;

    if (
      !sourceVaultAddress ||
      !sourceVaultChainId ||
      !sourceVaultUnderlyingToken ||
      !destVaultAddress ||
      !destVaultChainId ||
      !destVaultUnderlyingToken ||
      !recipientAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await migrate({
      sourceVaultAddress,
      sourceVaultChainId,
      sourceVaultUnderlyingToken,
      destVaultAddress,
      destVaultChainId,
      destVaultUnderlyingToken,
      recipientAddress,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
