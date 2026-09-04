import { NextResponse } from "next/server";
import { z } from "zod";
import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { getTableModel } from "@/models/Table";
import { getOrderModel } from "@/models/Order";
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
    const TableModel = await getTableModel();
    const OrderModel = await getOrderModel();

    const tables = await TableModel.find({ establishmentSlug: slug, isActive: true })
      .sort({ tableNumber: 1 })
      .lean();

    const unpaidOrders = await OrderModel.find({
      establishmentSlug: slug,
      paymentStatus: "unpaid",
      status: { $ne: "cancelled" },
    })
      .select("tableNumber seatCode totalAmount")
      .lean();

    const occupiedSeatsByTable = new Map<number, Set<string>>();
    for (const o of unpaidOrders) {
      const set = occupiedSeatsByTable.get(o.tableNumber) ?? new Set<string>();
      set.add(o.seatCode);
      occupiedSeatsByTable.set(o.tableNumber, set);
    }

    const result = tables.map((t) => {
      const occupiedSeats = occupiedSeatsByTable.get(t.tableNumber) ?? new Set<string>();
      const occupiedCount = t.seats.filter((s) => occupiedSeats.has(s.seatCode)).length;
      const state =
        occupiedCount === 0 ? "empty" : occupiedCount === t.seats.length ? "full" : "partial";
      return { ...t, occupiedCount, state };
    });

    return withCors(NextResponse.json({ tables: result }));
  } catch (err) {
    return errorResponse(err);
  }
}

const createTableSchema = z.object({
  tableNumber: z.number().int().positive(),
  name: z.string().min(1),
  zone: z.string().default("Asosiy zal"),
  capacity: z.number().int().positive().default(4),
  seats: z.array(z.string().min(1)).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = createTableSchema.parse(await req.json());

    const EstablishmentModel = await getEstablishmentModel();
    const est = await EstablishmentModel.findOne({ slug }).select("_id").lean();
    if (!est) {
      throw new ApiError("ESTABLISHMENT_NOT_FOUND", "Restoran topilmadi", 404);
    }

    const TableModel = await getTableModel();
    const existing = await TableModel.findOne({
      establishmentSlug: slug,
      tableNumber: body.tableNumber,
    }).lean();
    if (existing) {
      throw new ApiError("TABLE_ALREADY_EXISTS", "Bu raqamli stol allaqachon mavjud", 409);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const seats = body.seats.map((seatCode) => ({
      seatCode,
      label: `${body.tableNumber}${seatCode}`,
      qrUrl: `${baseUrl}/order/${slug}/${body.tableNumber}/${seatCode}`,
      isActive: true,
    }));

    const table = await TableModel.create({
      establishmentId: est._id,
      establishmentSlug: slug,
      tableNumber: body.tableNumber,
      name: body.name,
      zone: body.zone,
      capacity: body.capacity,
      seats,
      isActive: true,
    });

    return withCors(NextResponse.json({ table }, { status: 201 }));
  } catch (err) {
    return errorResponse(err);
  }
}
