import { NextResponse } from "next/server";
import { posChannelName } from "@/lib/pusher";
import { withCors, corsPreflight, ApiError, errorResponse } from "@/lib/api-error";

export async function OPTIONS() {
  return corsPreflight();
}

// Pusher channels used here are public (not "private-"/"presence-"), so no server-side
// channel auth is required. This endpoint just hands clients (e.g. the Electron app)
// the public config + channel name they need to connect directly to Pusher.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const establishmentSlug = searchParams.get("establishmentSlug");
    if (!establishmentSlug) {
      throw new ApiError("MISSING_SLUG", "establishmentSlug talab qilinadi", 400);
    }

    return withCors(
      NextResponse.json({
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2",
        channel: posChannelName(establishmentSlug),
        events: ["new_order", "order_status_changed", "order_paid"],
      })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
