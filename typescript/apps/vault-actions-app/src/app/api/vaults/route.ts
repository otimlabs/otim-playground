import { NextResponse } from "next/server";
import { fetchVaults } from "@/lib/vaults";

export async function GET() {
  try {
    const vaults = await fetchVaults();
    return NextResponse.json(vaults);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
