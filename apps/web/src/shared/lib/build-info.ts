declare const __APP_VERSION__: string | undefined;
declare const __APP_BUILD__: string | undefined;

function normalizeVersion(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized : "dev";
}

function normalizeBuild(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "unknown";
  return normalized.slice(0, 7).toLowerCase();
}

const version = normalizeVersion(__APP_VERSION__);

export const appBuildInfo = {
  version,
  build: normalizeBuild(__APP_BUILD__),
  displayVersion: version === "dev" ? "DEV" : version,
} as const;
