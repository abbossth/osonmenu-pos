import { Schema, Model, Connection } from "mongoose";
import { connectToPosDB } from "@/lib/pos-db";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "click" | "payme";

export interface OrderItem {
  itemId: unknown; // reference to osonmenu ItemEntity/Establishment item — never written back there
  name: string; // snapshot
  price: number; // snapshot
  quantity: number;
  note?: string;
}

export interface Order {
  _id: unknown;
  establishmentId: unknown;
  establishmentSlug: string;
  tableId: unknown;
  tableNumber: number;
  seatCode: string;
  seatLabel: string;
  orderNumber: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid";
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  printedAt?: Date;
  syncedToLocal?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: String,
  },
  { _id: false }
);

const OrderSchema = new Schema<Order>({
  establishmentId: { type: Schema.Types.ObjectId, required: true },
  establishmentSlug: { type: String, required: true, index: true },
  tableId: { type: Schema.Types.ObjectId, required: true },
  tableNumber: { type: Number, required: true },
  seatCode: { type: String, required: true },
  seatLabel: { type: String, required: true },
  orderNumber: { type: Number, required: true },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
    default: "pending",
  },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  paymentMethod: { type: String, enum: ["cash", "card", "click", "payme"] },
  paidAt: Date,
  printedAt: Date,
  syncedToLocal: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date },
}, { timestamps: true });

OrderSchema.index({ establishmentSlug: 1, tableNumber: 1, status: 1 });
OrderSchema.index({ establishmentSlug: 1, createdAt: -1 });

function buildModel(conn: Connection): Model<Order> {
  return (conn.models.Order as Model<Order>) ?? conn.model<Order>("Order", OrderSchema);
}

export async function getOrderModel(): Promise<Model<Order>> {
  const conn = await connectToPosDB();
  return buildModel(conn);
}
