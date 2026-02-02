import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LogtoProvider, type LogtoConfig } from "@logto/react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import HomePage from "@/components/pages/home";
import DetailPage from "@/components/pages/detail";
import WhoisPage from "@/components/pages/whois";
import { AuthCallback } from "@/components/auth-callback";

interface AppConfig {
  logto?: {
    endpoint: string;
    appId: string;
  };
}

function App() {
  const [logtoConfig, setLogtoConfig] = useState<LogtoConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config: AppConfig) => {
        if (config.logto?.endpoint && config.logto?.appId) {
          setLogtoConfig({
            endpoint: config.logto.endpoint,
            appId: config.logto.appId,
          });
        }
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
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/detail/:serverId" element={<DetailPage />} />
            <Route path="/detail/:serverId" element={<DetailPage />} />
            <Route path="/whois/:query" element={<WhoisPage />} />
            <Route path="/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );

  if (logtoConfig) {
    return <LogtoProvider config={logtoConfig}>{AppContent}</LogtoProvider>;
  }

  return AppContent;
}

export default App;
