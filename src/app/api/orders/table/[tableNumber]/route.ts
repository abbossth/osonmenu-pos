import { NextResponse } from "next/server";
import { getOrderModel } from "@/models/Order";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tableNumber: string }> }
) {
  try {
    const { tableNumber } = await params;
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      throw new ApiError("MISSING_SLUG", "slug talab qilinadi", 400);
    }

    const OrderModel = await getOrderModel();
    const orders = await OrderModel.find({
      establishmentSlug: slug,
      tableNumber: Number(tableNumber),
      paymentStatus: "unpaid",
      status: { $ne: "cancelled" },
    })
      .sort({ seatCode: 1, createdAt: 1 })
      .lean();

    const bySeat = new Map<string, { seatCode: string; seatLabel: string; orders: typeof orders; total: number }>();
    for (const order of orders) {
      const entry = bySeat.get(order.seatCode) ?? {
        seatCode: order.seatCode,
        seatLabel: order.seatLabel,
        orders: [],
        total: 0,
      };
      entry.orders.push(order);
      entry.total += order.totalAmount;
      bySeat.set(order.seatCode, entry);
    }

    const seats = Array.from(bySeat.values());
    const grandTotal = seats.reduce((sum, s) => sum + s.total, 0);

    return withCors(NextResponse.json({ seats, grandTotal }));
  } catch (err) {
    return errorResponse(err);
  }
}
