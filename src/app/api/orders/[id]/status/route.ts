import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrderModel } from "@/models/Order";
import { getPusherServer, posChannelName, PUSHER_EVENTS } from "@/lib/pusher";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

const statusSchema = z.object({
  status: z.enum(["confirmed", "preparing", "ready", "completed", "cancelled"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = statusSchema.parse(await req.json());

    const OrderModel = await getOrderModel();
    const order = await OrderModel.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { returnDocument: "after" }
    ).lean();

    if (!order) {
      throw new ApiError("ORDER_NOT_FOUND", "Buyurtma topilmadi", 404);
    }

    try {
      await getPusherServer().trigger(
        posChannelName(order.establishmentSlug),
        PUSHER_EVENTS.ORDER_STATUS_CHANGED,
        { order }
      );
    } catch (pushErr) {
      console.error("[Pusher] Failed to push order_status_changed", pushErr);
    }

    return withCors(NextResponse.json({ order }));
  } catch (err) {
    return errorResponse(err);
  }
}
