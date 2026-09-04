import { NextResponse } from "next/server";
import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  try {
    const EstablishmentModel = await getEstablishmentModel();
    const establishments = await EstablishmentModel.find({ guestsCanOrder: true })
      .select("_id name slug logoUrl phone currency city")
      .lean();

    return withCors(NextResponse.json({ establishments }));
  } catch (err) {
    return errorResponse(err);
  }
}
