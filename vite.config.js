

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0

    // ✅ allow Cloudflare Tunnel hostname(s)
    allowedHosts: [
      "bradley.davisbisbee.com",
      ".davisbisbee.com", // optional: allow any subdomain
      "localhost",
      "127.0.0.1",
    ],

    // keep your polling settings
    watch: {
      usePolling: true,
      interval: 300,
    },

    // ✅ (optional) if hot reload websocket is flaky through the tunnel
    // hmr: {
    //   host: "home.davisbisbee.com",
    //   protocol: "wss",
    // },
  },
});