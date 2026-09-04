import { NextResponse } from "next/server";
import { getOrderModel } from "@/models/Order";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const establishmentSlug = searchParams.get("establishmentSlug");
    if (!establishmentSlug) {
      throw new ApiError("MISSING_SLUG", "establishmentSlug talab qilinadi", 400);
    }

    const OrderModel = await getOrderModel();
    const since = new Date(Date.now() - TWELVE_HOURS_MS);

    const orders = await OrderModel.find({
      establishmentSlug,
      status: { $in: ["pending", "confirmed", "preparing"] },
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .lean();

    return withCors(NextResponse.json({ orders }));
  } catch (err) {
    return errorResponse(err);
  }
}
