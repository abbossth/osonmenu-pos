import { NextResponse } from "next/server";
import { z } from "zod";
import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { getTableModel } from "@/models/Table";
import { getOrderModel } from "@/models/Order";
import { getNextOrderNumber } from "@/models/DailyOrderCounter";
import { getPusherServer, posChannelName, PUSHER_EVENTS } from "@/lib/pusher";
import { ApiError, errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

const orderItemSchema = z.object({
  itemId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
});

const createOrderSchema = z.object({
  establishmentSlug: z.string().min(1),
  tableNumber: z.number().int().positive(),
  seatCode: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const body = createOrderSchema.parse(await req.json());

    // 1. Establishment slug bo'yicha topish (osonmenu bazasidan, READ ONLY)
    const EstablishmentModel = await getEstablishmentModel();
    const est = await EstablishmentModel.findOne({ slug: body.establishmentSlug })
      .select("_id")
      .lean();
    if (!est) {
      throw new ApiError("ESTABLISHMENT_NOT_FOUND", "Restoran topilmadi", 404);
    }

    // 2. Table va seat mavjudligini tekshirish (pos bazasidan)
    const TableModel = await getTableModel();
    const table = await TableModel.findOne({
      establishmentSlug: body.establishmentSlug,
      tableNumber: body.tableNumber,
      isActive: true,
    }).lean();
    if (!table) {
      throw new ApiError("TABLE_NOT_FOUND", "Stol topilmadi", 404);
    }
    const seat = table.seats.find((s) => s.seatCode === body.seatCode && s.isActive);
    if (!seat) {
      throw new ApiError("SEAT_NOT_FOUND", "Joy topilmadi", 404);
    }

    // 3. Item nomlar va narxlarni snapshot qilib saqlash (allaqachon body'da kelgan)
    const totalAmount = body.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // 4. DailyOrderCounter dan kunlik raqam olish
    const orderNumber = await getNextOrderNumber(est._id);

    // 5. POS bazasiga Order saqlash
    const OrderModel = await getOrderModel();
    const order = await OrderModel.create({
      establishmentId: est._id,
      establishmentSlug: body.establishmentSlug,
      tableId: table._id,
      tableNumber: body.tableNumber,
      seatCode: body.seatCode,
      seatLabel: seat.label,
      orderNumber,
      items: body.items,
      totalAmount,
      status: "pending",
      paymentStatus: "unpaid",
    });

    // 6. Pusher orqali Electron ga push
    try {
      await getPusherServer().trigger(
        posChannelName(body.establishmentSlug),
        PUSHER_EVENTS.NEW_ORDER,
        { order }
      );
    } catch (pushErr) {
      console.error("[Pusher] Failed to push new_order", pushErr);
    }

    return withCors(NextResponse.json({ order }, { status: 201 }));
  } catch (err) {
    return errorResponse(err);
  }
}
