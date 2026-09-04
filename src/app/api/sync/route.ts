import { NextResponse } from "next/server";
import { syncEstablishments } from "@/lib/sync";
import { errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST() {
  try {
    const result = await syncEstablishments();
    return withCors(NextResponse.json(result));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET() {
  return POST();
}
