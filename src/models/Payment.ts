import { Schema, Model, Connection } from "mongoose";
import { connectToPosDB } from "@/lib/pos-db";
import type { PaymentMethod } from "./Order";

export interface Payment {
  _id: unknown;
  establishmentId: unknown;
  tableNumber: number;
  paymentType: "seat" | "table";
  seatCode?: string;
  orderIds: unknown[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  paidAt: Date;
}

const PaymentSchema = new Schema<Payment>({
  establishmentId: { type: Schema.Types.ObjectId, required: true },
  tableNumber: { type: Number, required: true },
  paymentType: { type: String, enum: ["seat", "table"], required: true },
  seatCode: String,
  orderIds: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "card", "click", "payme"], required: true },
  receiptNumber: { type: String, required: true, unique: true },
  paidAt: { type: Date, default: Date.now },
});

function buildModel(conn: Connection): Model<Payment> {
  return (
    (conn.models.Payment as Model<Payment>) ?? conn.model<Payment>("Payment", PaymentSchema)
  );
}

export async function getPaymentModel(): Promise<Model<Payment>> {
  const conn = await connectToPosDB();
  return buildModel(conn);
}

/** Generates a receipt number like "PAY-2024-001" using an in-collection sequence per year. */
export async function generateReceiptNumber(): Promise<string> {
  const model = await getPaymentModel();
  const year = new Date().getFullYear();
  const count = await model.countDocuments({
    receiptNumber: { $regex: `^PAY-${year}-` },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `PAY-${year}-${seq}`;
}
