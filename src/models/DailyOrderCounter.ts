import { Schema, Model, Connection } from "mongoose";
import { connectToPosDB } from "@/lib/pos-db";

export interface DailyOrderCounter {
  _id: unknown;
  establishmentId: unknown;
  date: string; // "2024-01-15"
  counter: number;
}

const DailyOrderCounterSchema = new Schema<DailyOrderCounter>({
  establishmentId: { type: Schema.Types.ObjectId, required: true },
  date: { type: String, required: true },
  counter: { type: Number, default: 0 },
});

DailyOrderCounterSchema.index({ establishmentId: 1, date: 1 }, { unique: true });

function buildModel(conn: Connection): Model<DailyOrderCounter> {
  return (
    (conn.models.DailyOrderCounter as Model<DailyOrderCounter>) ??
    conn.model<DailyOrderCounter>("DailyOrderCounter", DailyOrderCounterSchema)
  );
}

export async function getDailyOrderCounterModel(): Promise<Model<DailyOrderCounter>> {
  const conn = await connectToPosDB();
  return buildModel(conn);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Atomically increments (and returns) today's order counter for an establishment. */
export async function getNextOrderNumber(establishmentId: unknown): Promise<number> {
  const model = await getDailyOrderCounterModel();
  const date = todayString();
  const doc = await model.findOneAndUpdate(
    { establishmentId, date },
    { $inc: { counter: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return doc!.counter;
}
