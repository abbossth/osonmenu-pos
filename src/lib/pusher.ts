import PusherServer from "pusher";

let serverClient: PusherServer | null = null;

export function getPusherServer(): PusherServer {
  if (!serverClient) {
    serverClient = new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER ?? "ap2",
      useTLS: true,
    });
  }
  return serverClient;
}

export function posChannelName(establishmentSlug: string): string {
  return `pos-${establishmentSlug}`;
}

export const PUSHER_EVENTS = {
  NEW_ORDER: "new_order",
  ORDER_STATUS_CHANGED: "order_status_changed",
  ORDER_PAID: "order_paid",
} as const;
