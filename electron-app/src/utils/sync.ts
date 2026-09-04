import type { LocalOrderRow } from "../../electron/preload";

const SYNC_INTERVAL_MS = 30000;

interface SyncOptions {
  serverUrl: string;
  establishmentSlug: string;
}

/**
 * Every 30s:
 * 1. Find locally-changed orders (synced = 0 — e.g. a status button tapped while offline)
 * 2. Push each change to the server
 * 3. Mark it synced = 1 on success
 * 4. Pull the latest order list from the server (polling-fallback reconciliation)
 */
export function startSyncLoop(opts: SyncOptions): () => void {
  const tick = async () => {
    try {
      const unsynced = await window.api.db.getUnsyncedOrders();
      const syncedIds: string[] = [];

      for (const order of unsynced as LocalOrderRow[]) {
        try {
          const res = await fetch(`${opts.serverUrl}/api/orders/${order.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: order.status }),
          });
          if (res.ok) syncedIds.push(order.id);
        } catch (err) {
          console.error("[Sync] Failed to push order status", order.id, err);
        }
      }

      if (syncedIds.length > 0) {
        await window.api.db.markSynced(syncedIds);
      }

      const res = await fetch(
        `${opts.serverUrl}/api/orders/pending?establishmentSlug=${opts.establishmentSlug}`
      );
      if (res.ok) {
        const data = await res.json();
        await window.api.db.upsertOrders(
          data.orders.map(
            (o: {
              _id: string;
              establishmentSlug: string;
              tableNumber: number;
              seatLabel: string;
              orderNumber: number;
              items: unknown;
              totalAmount: number;
              status: string;
              paymentStatus: string;
              createdAt: string;
            }) => ({
              id: o._id,
              establishment_slug: o.establishmentSlug,
              table_number: o.tableNumber,
              seat_label: o.seatLabel,
              order_number: o.orderNumber,
              items: JSON.stringify(o.items),
              total_amount: o.totalAmount,
              status: o.status,
              payment_status: o.paymentStatus,
              created_at: o.createdAt,
            })
          )
        );
      }
    } catch (err) {
      console.error("[Sync] Sync tick failed (likely offline)", err);
    }
  };

  tick();
  const interval = setInterval(tick, SYNC_INTERVAL_MS);
  return () => clearInterval(interval);
}
