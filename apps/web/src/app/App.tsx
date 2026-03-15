import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LazyMotion, domAnimation } from "motion/react";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { I18nProvider, useTranslation } from "@/shared/i18n/provider";
import { ConfigProvider } from "@/entities/server/config-context";
import { Button } from "@/shared/ui/button";
import { AppHeader } from "@/shared/ui/app-header";
import { appBuildInfo } from "@/shared/lib/build-info";
import { useDebuggerGuard } from "@/shared/hooks/use-debugger-guard";
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/ui/empty";
import { type AuthStatus, type ClientConfig } from "@/entities/server/types";
import HomePage from "@/features/server-select/ui/home-page";

const DetailPage = lazy(() => import("@/app/routes/detail-page"));

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <LazyMotion features={domAnimation}>
          <AppBootstrap />
        </LazyMotion>
      </I18nProvider>
    </ThemeProvider>
  );
}

function isClientConfig(value: unknown): value is ClientConfig {
  if (!value || typeof value !== "object") return false;
  const cfg = value as Partial<ClientConfig>;
  if (!Array.isArray(cfg.servers)) return false;
  if (!cfg.turnstile || typeof cfg.turnstile.siteKey !== "string") return false;
  if (cfg.logto) {
    if (typeof cfg.logto.endpoint !== "string" || typeof cfg.logto.appId !== "string") return false;
  }
  return true;
}

function isAuthStatus(value: unknown): value is AuthStatus {
  if (!value || typeof value !== "object") return false;
  const auth = value as Partial<AuthStatus>;
  if (typeof auth.isAuthenticated !== "boolean") return false;
  if (auth.user !== undefined && typeof auth.user !== "string") return false;
  if (auth.authType !== undefined && typeof auth.authType !== "string") return false;
  return true;
}

function AppBootstrap() {
  const { t } = useTranslation();
  const isDebuggerBlocked = useDebuggerGuard();
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const currentYear = new Date().getFullYear();

  const loadConfig = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setHasLoadError(false);
    try {
      const [cfgRes, authRes] = await Promise.all([
        fetch("/api/config", { signal }),
        fetch("/api/auth", { signal }),
      ]);
      if (!cfgRes.ok) throw new Error(`Unexpected status: ${cfgRes.status}`);
      if (!authRes.ok) throw new Error(`Unexpected status: ${authRes.status}`);

      const cfgJson: unknown = await cfgRes.json();
      const authJson: unknown = await authRes.json();

      if (!isClientConfig(cfgJson)) throw new Error("Invalid config payload");
      if (!isAuthStatus(authJson)) throw new Error("Invalid auth payload");

      setConfig({ ...cfgJson, auth: authJson });
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to bootstrap app:", error);
      setConfig(null);
      setHasLoadError(true);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadConfig(controller.signal);
    return () => controller.abort();
  }, [loadConfig]);

  if (isDebuggerBlocked) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
      </div>
    );
  }

  if (hasLoadError || !config) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyTitle>{t.error.title}</EmptyTitle>
            <EmptyDescription>{t.error.failed_load_config}</EmptyDescription>
          </EmptyHeader>
          <EmptyActions>
            <Button onClick={() => void loadConfig()}>{t.common.retry}</Button>
          </EmptyActions>
        </Empty>
      </div>
    );
  }

  return (
    <ConfigProvider value={config}>
      <BrowserRouter>
        <div className="min-h-dvh flex flex-col">
          <main className="flex-1 flex flex-col">
            <Suspense
              fallback={
                <div className="flex-1 bg-background flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/detail/:serverId" element={<DetailPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <footer className="border-t bg-card mt-auto shrink-0 w-full">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <p>Copyright © {currentYear} Sunyz Network. All rights reserved.</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Version {appBuildInfo.displayVersion} (build{" "}
                  <span className="font-mono">{appBuildInfo.build}</span>)
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span>Acceptable Use Policy</span>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 bg-background flex flex-col font-sans">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-6">
        <Empty className="max-w-none gap-3 rounded-none border-0 bg-transparent p-0 shadow-none">
          <EmptyHeader>
            <EmptyTitle className="text-5xl leading-[1.15] text-muted-foreground/70 md:text-6xl">
              404
            </EmptyTitle>
            <EmptyDescription className="font-title text-base text-foreground">
              {t.error.page_not_found_title}
            </EmptyDescription>
            <EmptyDescription>{t.error.page_not_found_description}</EmptyDescription>
          </EmptyHeader>
          <EmptyActions>
            <Button asChild>
              <Link to="/">{t.common.back_to_home}</Link>
            </Button>
          </EmptyActions>
        </Empty>
      </div>
    </div>
  );
}

export default App;
