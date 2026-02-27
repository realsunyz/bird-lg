import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@logto")) return "logto";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-circle-flags")) return "flags";
          if (id.includes("react-turnstile")) return "turnstile";
          return "vendor";
        },
      },
    },
  },
});
