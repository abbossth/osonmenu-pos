// READ-ONLY mirror of the OsonMenu `MenuEntity` collection.
import { Schema, Model, Connection } from "mongoose";
import { connectToOsonMenuDB } from "@/lib/osonmenu-db";
import type { I18nText } from "./Establishment";

export interface MenuEntity {
  _id: unknown;
  establishmentId: unknown;
  id: string;
  name: string;
  nameI18n?: I18nText;
  order: number;
  isVisible: boolean;
}

const MenuEntitySchema = new Schema<MenuEntity>(
  {
    establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment" },
    id: String,
    name: String,
    nameI18n: { uz: String, ru: String, en: String },
    order: Number,
    isVisible: Boolean,
  },
  { collection: "menuentities" }
);

function buildModel(conn: Connection): Model<MenuEntity> {
  return (
    (conn.models.MenuEntity as Model<MenuEntity>) ??
    conn.model<MenuEntity>("MenuEntity", MenuEntitySchema)
  );
}

export async function getMenuEntityModel(): Promise<Model<MenuEntity>> {
  const conn = await connectToOsonMenuDB();
  return buildModel(conn);
}
