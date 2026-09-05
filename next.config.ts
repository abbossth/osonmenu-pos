import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones on the local network to load the dev server when scanning a
  // table QR code (e.g. http://192.168.1.x:3000/order/...) — otherwise Next's
  // dev server blocks the client JS bundle as a cross-origin request and the
  // page stays stuck on its initial loading state forever.
  allowedDevOrigins: ["192.168.0.*", "192.168.1.*", "10.0.0.*"],
};

export default nextConfig;
