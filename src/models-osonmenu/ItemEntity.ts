// READ-ONLY mirror of the OsonMenu `ItemEntity` collection.
import { Schema, Model, Connection } from "mongoose";
import { connectToOsonMenuDB } from "@/lib/osonmenu-db";
import type { I18nText } from "./Establishment";

export interface ItemEntity {
  _id: unknown;
  establishmentId: unknown;
  categoryId: unknown;
  name: string;
  nameI18n?: I18nText;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  order: number;
}

const ItemEntitySchema = new Schema<ItemEntity>(
  {
    establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment" },
    categoryId: { type: Schema.Types.ObjectId, ref: "CategoryEntity" },
    name: String,
    nameI18n: { uz: String, ru: String, en: String },
    price: Number,
    imageUrl: String,
    isAvailable: Boolean,
    order: Number,
  },
  { collection: "itementities" }
);

function buildModel(conn: Connection): Model<ItemEntity> {
  return (
    (conn.models.ItemEntity as Model<ItemEntity>) ??
    conn.model<ItemEntity>("ItemEntity", ItemEntitySchema)
  );
}

export async function getItemEntityModel(): Promise<Model<ItemEntity>> {
  const conn = await connectToOsonMenuDB();
  return buildModel(conn);
}
