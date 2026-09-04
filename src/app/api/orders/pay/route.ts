import { NextResponse } from "next/server";
import { z } from "zod";
import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { getOrderModel } from "@/models/Order";
import { generateReceiptNumber, getPaymentModel } from "@/models/Payment";
import { getPusherServer, posChannelName, PUSHER_EVENTS } from "@/lib/pusher";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

const paySchema = z.object({
  establishmentSlug: z.string().min(1),
  paymentType: z.enum(["seat", "table"]),
  paymentMethod: z.enum(["cash", "card", "click", "payme"]),
  tableNumber: z.number().int().positive(),
  seatCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = paySchema.parse(await req.json());
    if (body.paymentType === "seat" && !body.seatCode) {
      throw new ApiError("SEAT_CODE_REQUIRED", "seatCode 'seat' to'lovi uchun talab qilinadi", 400);
    }

    const EstablishmentModel = await getEstablishmentModel();
    const est = await EstablishmentModel.findOne({ slug: body.establishmentSlug })
      .select("_id")
      .lean();
    if (!est) {
      throw new ApiError("ESTABLISHMENT_NOT_FOUND", "Restoran topilmadi", 404);
    }

    const OrderModel = await getOrderModel();
    const query: Record<string, unknown> = {
      establishmentSlug: body.establishmentSlug,
      tableNumber: body.tableNumber,
      paymentStatus: "unpaid",
      status: { $ne: "cancelled" },
    };
    if (body.paymentType === "seat") {
      query.seatCode = body.seatCode;
    }

    const orders = await OrderModel.find(query).lean();
    if (orders.length === 0) {
      throw new ApiError("NO_UNPAID_ORDERS", "To'lanmagan buyurtmalar topilmadi", 404);
    }

    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const receiptNumber = await generateReceiptNumber();
    const paidAt = new Date();

    const PaymentModel = await getPaymentModel();
    const payment = await PaymentModel.create({
      establishmentId: est._id,
      tableNumber: body.tableNumber,
      paymentType: body.paymentType,
      seatCode: body.seatCode,
      orderIds: orders.map((o) => o._id),
      totalAmount,
      paymentMethod: body.paymentMethod,
      receiptNumber,
      paidAt,
    });

    await OrderModel.updateMany(
      { _id: { $in: orders.map((o) => o._id) } },
      {
        paymentStatus: "paid",
        paymentMethod: body.paymentMethod,
        paidAt,
        status: "completed",
        updatedAt: paidAt,
      }
    );

    try {
      await getPusherServer().trigger(
        posChannelName(body.establishmentSlug),
        PUSHER_EVENTS.ORDER_PAID,
        { payment, orderIds: orders.map((o) => o._id) }
      );
    } catch (pushErr) {
      console.error("[Pusher] Failed to push order_paid", pushErr);
    }

    return withCors(NextResponse.json({ payment }, { status: 201 }));
  } catch (err) {
    return errorResponse(err);
  }
}
