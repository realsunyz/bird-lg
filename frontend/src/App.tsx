import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: ClientConfig) => {
        setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const AppContent = (
    <ConfigProvider value={config || ({} as ClientConfig)}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">
                    Loading...
                  </div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/detail/:serverId" element={<DetailPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );

  return AppContent;
}

function NotFoundPage() {
  const config = useConfig();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between">
          <span className="text-lg font-normal font-title tracking-tight">
            {config.app.title}
          </span>
          <LanguageSwitcher />
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
            <EmptyDescription>
              {t.error.page_not_found_description}
            </EmptyDescription>
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
