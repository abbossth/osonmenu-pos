import { NextResponse } from "next/server";
import { getOrderModel } from "@/models/Order";
import { getTableModel } from "@/models/Table";
import { errorResponse, withCors, corsPreflight } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const OrderModel = await getOrderModel();
    const TableModel = await getTableModel();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayOrders, revenueAgg, activeTables] = await Promise.all([
      OrderModel.countDocuments({
        establishmentSlug: slug,
        createdAt: { $gte: startOfDay },
        status: { $ne: "cancelled" },
      }),
      OrderModel.aggregate([
        {
          $match: {
            establishmentSlug: slug,
            paymentStatus: "paid",
            paidAt: { $gte: startOfDay },
          },
        },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
      ]),
      TableModel.countDocuments({ establishmentSlug: slug, isActive: true }),
    ]);

    return withCors(
      NextResponse.json({
        todayOrders,
        todayRevenue: revenueAgg[0]?.revenue ?? 0,
        activeTables,
      })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
