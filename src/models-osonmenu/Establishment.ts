// READ-ONLY mirror of the OsonMenu `Establishment` collection.
// Do not add write methods here — this model must only ever .find()/.findOne()/.lean().
import { Schema, Model, Connection } from "mongoose";
import { connectToOsonMenuDB } from "@/lib/osonmenu-db";

export interface I18nText {
  uz?: string;
  ru?: string;
  en?: string;
}

export interface EstablishmentMenu {
  id: string;
  name: string;
  nameI18n?: I18nText;
  order: number;
  isVisible: boolean;
}

export interface EstablishmentItem {
  _id: unknown;
  name: string;
  nameI18n?: I18nText;
  description?: string;
  price: number;
  imageUrl?: string;
  badge?: "popular" | "new" | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  order: number;
}

export interface EstablishmentCategory {
  _id: unknown;
  menuId: string;
  menuName: string;
  name: string;
  nameI18n?: I18nText;
  description?: string;
  imageUrl?: string;
  isVisible?: boolean;
  order: number;
  items: EstablishmentItem[];
}

export interface Establishment {
  _id: unknown;
  ownerId: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  phone?: string;
  currency: "UZS" | "USD";
  language: "uz" | "ru" | "en";
  guestsCanOrder?: boolean;
  color?: string;
  country?: string;
  city?: string;
  address?: string;
  menus: EstablishmentMenu[];
  categories: EstablishmentCategory[];
  addons?: unknown[];
  createdAt: Date;
}

const I18nSchema = new Schema<I18nText>(
  { uz: String, ru: String, en: String },
  { _id: false }
);

const ItemSchema = new Schema<EstablishmentItem>(
  {
    name: String,
    nameI18n: I18nSchema,
    description: String,
    price: Number,
    imageUrl: String,
    badge: { type: String, enum: ["popular", "new", null], default: null },
    isVisible: Boolean,
    isAvailable: Boolean,
    order: Number,
  },
  { _id: true }
);

const CategorySchema = new Schema<EstablishmentCategory>(
  {
    menuId: String,
    menuName: String,
    name: String,
    nameI18n: I18nSchema,
    description: String,
    imageUrl: String,
    isVisible: Boolean,
    order: Number,
    items: [ItemSchema],
  },
  { _id: true }
);

const MenuSchema = new Schema<EstablishmentMenu>(
  {
    id: String,
    name: String,
    nameI18n: I18nSchema,
    order: Number,
    isVisible: Boolean,
  },
  { _id: false }
);

const EstablishmentSchema = new Schema<Establishment>(
  {
    ownerId: String,
    userId: String,
    name: String,
    slug: { type: String, unique: true },
    logoUrl: String,
    phone: String,
    currency: { type: String, enum: ["UZS", "USD"] },
    language: { type: String, enum: ["uz", "ru", "en"] },
    guestsCanOrder: Boolean,
    color: String,
    country: String,
    city: String,
    address: String,
    menus: [MenuSchema],
    categories: [CategorySchema],
    addons: [Schema.Types.Mixed],
    createdAt: Date,
  },
  { collection: "establishments" }
);

function buildModel(conn: Connection): Model<Establishment> {
  return (
    (conn.models.Establishment as Model<Establishment>) ??
    conn.model<Establishment>("Establishment", EstablishmentSchema)
  );
}

export async function getEstablishmentModel(): Promise<Model<Establishment>> {
  const conn = await connectToOsonMenuDB();
  return buildModel(conn);
}
