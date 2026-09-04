export function formatMoney(amount: number, currency: string = "UZS"): string {
  return `${amount.toLocaleString("ru-RU")} ${currency === "UZS" ? "so'm" : currency}`;
}
