import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

function normalizeVersion(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized : "dev";
}

function resolveGitBuild(): string {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      cwd: path.resolve(webRoot, "..", ".."),
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function normalizeBuild(value: string | undefined): string {
  const normalized = value?.trim();
  if (normalized) {
    return normalized.slice(0, 7).toLowerCase();
  }
  return resolveGitBuild().slice(0, 7).toLowerCase();
}

const appVersion = normalizeVersion(process.env.APP_VERSION);
const appBuild = normalizeBuild(process.env.APP_BUILD);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD__: JSON.stringify(appBuild),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(webRoot, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("@radix-ui") || id.includes("radix-ui") || id.includes("vaul")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-circle-flags")) return "flags";
          if (id.includes("react-turnstile")) return "turnstile";
          if (id.includes("shiki") || id.includes("@shikijs")) return "shiki";
          if (id.includes("motion") || id.includes("framer-motion")) return "motion";
          return "vendor";
        },
      },
    },
  },
});
