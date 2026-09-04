import type { RemoteOrder } from "../types";

function formatMoney(n: number): string {
  return n.toLocaleString("ru-RU");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

/** Chek matni: oshpaz uchun — narxsiz, faqat taom nomlari va izohlar. */
export function buildKitchenReceipt(order: RemoteOrder): string {
  const lines = [
    "================================",
    "        OSHPAZ CHEKI",
    "================================",
    `Stol: ${order.tableNumber}          Joy: ${order.seatLabel}`,
    `Vaqt: ${formatTime(order.createdAt)}`,
    "--------------------------------",
    ...order.items.flatMap((item) => {
      const row = `${item.quantity}x  ${item.name}`;
      return item.note ? [row, `    [${item.note}]`] : [row];
    }),
    "================================",
    `ORDER #${order.orderNumber}`,
    "================================",
  ];
  return lines.join("\n");
}

/** Chek matni: kassir uchun — narxli, jami summasi bilan. */
export function buildCashierReceipt(order: RemoteOrder, establishmentName: string): string {
  const nameCol = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
  const lines = [
    "================================",
    centerText(establishmentName.toUpperCase(), 32),
    "================================",
    `Stol: ${order.tableNumber}       Joy: ${order.seatLabel}`,
    `Buyurtma: #${order.orderNumber}`,
    `Vaqt: ${formatTime(order.createdAt)}`,
    "--------------------------------",
    ...order.items.map((item) => {
      const total = formatMoney(item.price * item.quantity);
      return `${nameCol(item.name, 14)} x${item.quantity}  ${total.padStart(10)}`;
    }),
    "--------------------------------",
    `JAMI:                ${formatMoney(order.totalAmount)} UZS`,
    "================================",
    order.paymentStatus === "paid" ? "        To'landi" : "     To'lov kutilmoqda",
    "================================",
  ];
  return lines.join("\n");
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}
