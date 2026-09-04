export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export interface RemoteOrder {
  _id: string;
  establishmentSlug: string;
  tableNumber: number;
  seatLabel: string;
  orderNumber: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid";
  createdAt: string;
}
