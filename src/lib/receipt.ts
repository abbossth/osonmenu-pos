import { formatMoney } from "./format";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

interface ReceiptOrder {
  orderNumber: number;
  seatLabel: string;
  items: ReceiptItem[];
  totalAmount: number;
  createdAt: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds a print-ready HTML receipt (kassir cheki) for the browser's print dialog. */
export function buildReceiptHtml(
  order: ReceiptOrder,
  establishmentName: string,
  tableNumber: string
): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>${item.quantity}x ${escapeHtml(item.name)}${item.note ? ` <span class="note">[${escapeHtml(item.note)}]</span>` : ""}</td>
        <td class="right">${formatMoney(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const time = new Date(order.createdAt).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Chek #${order.orderNumber}</title>
<style>
  body { font-family: "Courier New", monospace; width: 300px; margin: 0 auto; padding: 16px; font-size: 13px; color: #000; }
  .center { text-align: center; }
  .right { text-align: right; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .note { color: #555; font-size: 11px; }
  .total { font-weight: bold; font-size: 15px; }
  @media print { body { width: auto; } }
</style>
</head>
<body>
  <p class="center"><strong>${escapeHtml(establishmentName || "OsonMenu POS")}</strong></p>
  <div class="line"></div>
  <p>Stol: ${escapeHtml(tableNumber)}&nbsp;&nbsp;&nbsp;Joy: ${escapeHtml(order.seatLabel)}</p>
  <p>Buyurtma: #${order.orderNumber}</p>
  <p>Vaqt: ${time}</p>
  <div class="line"></div>
  <table>${rows}</table>
  <div class="line"></div>
  <p class="total">JAMI: ${formatMoney(order.totalAmount)}</p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

/** Opens the given HTML in a new tab/window and (via the script it contains) triggers print. */
export function openReceiptWindow(html: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "width=380,height=640");
  if (!win) {
    window.alert("Chek oynasi bloklandi — brauzerning popup blokerini o'chiring");
  }
}
