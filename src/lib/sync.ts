import { getEstablishmentModel } from "@/models-osonmenu/Establishment";
import { getTableModel } from "@/models/Table";

export interface SyncResult {
  totalEstablishments: number;
  newSlugs: string[];
  checkedAt: Date;
}

/**
 * OsonMenu bazasi POS uchun "source of truth" — bu funksiya yozmaydi,
 * faqat qaysi restoranlar POS da hali stol sozlanmagan (yangi) ekanini aniqlaydi.
 * Restoranlar ro'yxati har doim osonmenu bazasidan LIVE o'qiladi (GET /api/establishments);
 * bu sync faqat admin panelga bildirishnoma/statistika berish uchun.
 */
export async function syncEstablishments(): Promise<SyncResult> {
  const EstablishmentModel = await getEstablishmentModel();
  const TableModel = await getTableModel();

  const establishments = await EstablishmentModel.find({ guestsCanOrder: true })
    .select("slug")
    .lean();

  const slugsWithTables = new Set(
    await TableModel.distinct("establishmentSlug")
  );

  const newSlugs = establishments
    .map((e) => e.slug)
    .filter((slug) => !slugsWithTables.has(slug));

  return {
    totalEstablishments: establishments.length,
    newSlugs,
    checkedAt: new Date(),
  };
}
