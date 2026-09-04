import Pusher, { Channel } from "pusher-js";
import type { RemoteOrder } from "../types";

export type ConnectionState = "websocket" | "polling" | "connecting";

interface OrderManagerOptions {
  serverUrl: string;
  establishmentSlug: string;
  pusherKey: string;
  pusherCluster: string;
  onOrders: (orders: RemoteOrder[]) => void;
  onConnectionState: (state: ConnectionState) => void;
}

const POLL_INTERVAL_MS = 3000;
const RECONNECT_CHECK_MS = 30000;

/**
 * Owns the realtime connection to the POS server: tries Pusher first, and
 * transparently falls back to REST polling (GET /api/orders/pending) if the
 * websocket is unavailable — matching the offline-friendly design of the app.
 */
export class OrderManager {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private state: ConnectionState = "connecting";

  constructor(private opts: OrderManagerOptions) {}

  start() {
    if (this.opts.pusherKey) {
      this.connectPusher();
    } else {
      this.startPolling();
    }
    this.reconnectTimer = setInterval(() => {
      if (this.state === "polling" && this.opts.pusherKey) {
        this.connectPusher();
      }
    }, RECONNECT_CHECK_MS);
  }

  stop() {
    this.channel?.unbind_all();
    this.pusher?.disconnect();
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.reconnectTimer) clearInterval(this.reconnectTimer);
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.opts.onConnectionState(state);
  }

  private connectPusher() {
    this.setState("connecting");
    this.pusher?.disconnect();

    const pusher = new Pusher(this.opts.pusherKey, {
      cluster: this.opts.pusherCluster,
    });
    this.pusher = pusher;

    pusher.connection.bind("connected", () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.setState("websocket");
      this.fetchPending();
    });

    pusher.connection.bind("unavailable", () => this.startPolling());
    pusher.connection.bind("failed", () => this.startPolling());
    pusher.connection.bind("disconnected", () => this.startPolling());

    const channel = pusher.subscribe(`pos-${this.opts.establishmentSlug}`);
    this.channel = channel;
    channel.bind("new_order", () => this.fetchPending());
    channel.bind("order_status_changed", () => this.fetchPending());
    channel.bind("order_paid", () => this.fetchPending());
  }

  private startPolling() {
    if (this.pollTimer) return;
    this.setState("polling");
    this.fetchPending();
    this.pollTimer = setInterval(() => this.fetchPending(), POLL_INTERVAL_MS);
  }

  private async fetchPending() {
    try {
      const res = await fetch(
        `${this.opts.serverUrl}/api/orders/pending?establishmentSlug=${this.opts.establishmentSlug}`
      );
      const data = await res.json();
      if (res.ok) this.opts.onOrders(data.orders);
    } catch (err) {
      console.error("[OrderManager] Failed to fetch pending orders", err);
    }
  }
}
