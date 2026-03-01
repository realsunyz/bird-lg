import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LazyMotion, domAnimation } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider, useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ConfigProvider, useConfig } from "@/contexts/config-context";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { type ClientConfig } from "@/lib/types";
import HomePage from "@/components/pages/home";

const DetailPage = lazy(() => import("@/components/pages/detail"));

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
  if (!cfg.app || typeof cfg.app.title !== "string") return false;
  if (!Array.isArray(cfg.servers)) return false;
  return true;
}

function AppBootstrap() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadConfig = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setHasLoadError(false);
    try {
      const res = await fetch("/api/config", { signal });
      if (!res.ok) {
        throw new Error(`Unexpected status: ${res.status}`);
      }
      const data: unknown = await res.json();
      if (!isClientConfig(data)) {
        throw new Error("Invalid config payload");
      }
      setConfig(data);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to load /api/config:", error);
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
          <footer className="border-t py-6 text-center text-sm text-muted-foreground font-sans bg-card mt-auto shrink-0 w-full">
            <p>{t.home.powered_by}</p>
          </footer>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function NotFoundPage() {
  const config = useConfig();
  const { t } = useTranslation();

  return (
    <div className="flex-1 bg-background flex flex-col font-sans">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between">
          <span className="text-lg font-normal font-title tracking-tight">{config.app.title}</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
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
