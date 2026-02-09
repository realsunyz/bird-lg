import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LogtoProvider, type LogtoConfig } from "@logto/react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { ConfigProvider } from "@/contexts/config-context";
import { type ClientConfig } from "@/lib/types";
import HomePage from "@/components/pages/home";

const DetailPage = lazy(() => import("@/components/pages/detail"));
const AuthCallback = lazy(() =>
  import("@/components/auth-callback").then((m) => ({ default: m.AuthCallback })),
);

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
                <Route path="/callback" element={<AuthCallback />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );

  if (config?.logto?.endpoint && config?.logto?.appId) {
    const logtoConfig: LogtoConfig = {
      endpoint: config.logto.endpoint,
      appId: config.logto.appId,
    };
    return <LogtoProvider config={logtoConfig}>{AppContent}</LogtoProvider>;
  }

  return AppContent;
}

export default App;
