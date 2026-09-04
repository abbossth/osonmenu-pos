import { Schema, Model, Connection } from "mongoose";
import { connectToPosDB } from "@/lib/pos-db";

export interface TableSeat {
  seatCode: string;
  label: string;
  qrUrl: string;
  isActive: boolean;
}

export interface Table {
  _id: unknown;
  establishmentId: unknown;
  establishmentSlug: string;
  tableNumber: number;
  name: string;
  zone: string;
  capacity: number;
  seats: TableSeat[];
  isActive: boolean;
  createdAt: Date;
}

const SeatSchema = new Schema<TableSeat>(
  {
    seatCode: { type: String, required: true },
    label: { type: String, required: true },
    qrUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const TableSchema = new Schema<Table>({
  establishmentId: { type: Schema.Types.ObjectId, required: true },
  establishmentSlug: { type: String, required: true, index: true },
  tableNumber: { type: Number, required: true },
  name: { type: String, required: true },
  zone: { type: String, default: "Asosiy zal" },
  capacity: { type: Number, default: 4 },
  seats: [SeatSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

TableSchema.index({ establishmentSlug: 1, tableNumber: 1 }, { unique: true });

function buildModel(conn: Connection): Model<Table> {
  return (conn.models.Table as Model<Table>) ?? conn.model<Table>("Table", TableSchema);
}

export async function getTableModel(): Promise<Model<Table>> {
  const conn = await connectToPosDB();
  return buildModel(conn);
}
