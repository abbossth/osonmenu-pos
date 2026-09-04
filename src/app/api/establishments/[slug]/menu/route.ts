import { NextResponse } from "next/server";
import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const EstablishmentModel = await getEstablishmentModel();
    const est = await EstablishmentModel.findOne({ slug })
      .select("name slug logoUrl currency categories menus")
      .lean();

    if (!est) {
      throw new ApiError("ESTABLISHMENT_NOT_FOUND", "Restoran topilmadi", 404);
    }

    const menus = (est.menus ?? [])
      .filter((m) => m.isVisible)
      .sort((a, b) => a.order - b.order);

    const categories = (est.categories ?? [])
      .filter((c) => c.isVisible !== false)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        ...c,
        items: (c.items ?? [])
          .filter((i) => i.isVisible !== false && i.isAvailable !== false)
          .sort((a, b) => a.order - b.order),
      }));

    return withCors(
      NextResponse.json({
        name: est.name,
        slug: est.slug,
        logoUrl: est.logoUrl,
        currency: est.currency,
        menus,
        categories,
      })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
