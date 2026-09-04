import { NextResponse } from "next/server";
import { getOrderModel } from "@/models/Order";
import { getPusherServer, posChannelName, PUSHER_EVENTS } from "@/lib/pusher";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

// Marks an order as sent-to-print and re-broadcasts it so the Electron app
// (which owns the actual thermal printer) picks it up and prints kitchen/cashier receipts.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const OrderModel = await getOrderModel();
    const order = await OrderModel.findByIdAndUpdate(
      id,
      { printedAt: new Date() },
      { returnDocument: "after" }
    ).lean();

    if (!order) {
      throw new ApiError("ORDER_NOT_FOUND", "Buyurtma topilmadi", 404);
    }

    try {
      await getPusherServer().trigger(posChannelName(order.establishmentSlug), PUSHER_EVENTS.NEW_ORDER, {
        order,
        rePrint: true,
      });
    } catch (pushErr) {
      console.error("[Pusher] Failed to push print request", pushErr);
    }

    return withCors(NextResponse.json({ order }));
  } catch (err) {
    return errorResponse(err);
  }
}
