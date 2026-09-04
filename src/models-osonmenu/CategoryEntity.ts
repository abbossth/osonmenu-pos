// READ-ONLY mirror of the OsonMenu `CategoryEntity` collection.
import { Schema, Model, Connection } from "mongoose";
import { connectToOsonMenuDB } from "@/lib/osonmenu-db";
import type { I18nText } from "./Establishment";

export interface CategoryEntity {
  _id: unknown;
  establishmentId: unknown;
  menuId: string;
  name: string;
  nameI18n?: I18nText;
  order: number;
  isVisible: boolean;
}

const CategoryEntitySchema = new Schema<CategoryEntity>(
  {
    establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment" },
    menuId: String,
    name: String,
    nameI18n: { uz: String, ru: String, en: String },
    order: Number,
    isVisible: Boolean,
  },
  { collection: "categoryentities" }
);

function buildModel(conn: Connection): Model<CategoryEntity> {
  return (
    (conn.models.CategoryEntity as Model<CategoryEntity>) ??
    conn.model<CategoryEntity>("CategoryEntity", CategoryEntitySchema)
  );
}

export async function getCategoryEntityModel(): Promise<Model<CategoryEntity>> {
  const conn = await connectToOsonMenuDB();
  return buildModel(conn);
}
