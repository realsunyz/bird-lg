"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

interface ServerConfig {
  id: string;
  name: string;
  location: string;
  icon?: string;
}

interface ClientConfig {
  turnstile: { siteKey: string };
  servers: ServerConfig[];
  app: { title: string; subtitle: string };
}

export default function HomePage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ClientConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {t.common.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 max-w-5xl mx-auto w-full justify-between">
          <span className="text-xl font-bold font-title tracking-tight">
            {t.home.app_title}
          </span>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold font-title mb-2 text-foreground">
          {t.home.app_title}
        </h1>
        <p className="text-muted-foreground mb-8 text-lg font-sans">
          {t.home.select_server}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {config.servers.map((server) => (
            <Link
              key={server.id}
              href={`/detail/${server.id}`}
              className="block group"
            >
              <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center bg-muted/30 group-hover:bg-muted text-foreground transition-colors shrink-0 font-title">
                      <span className="text-lg font-medium">
                        {server.icon ||
                          server.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold font-title leading-tight mb-1">
                        {server.name}
                      </h2>
                      <p className="text-sm text-muted-foreground font-sans line-clamp-1">
                        {server.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {config.servers.length === 0 && (
          <p className="text-yellow-600 mt-4 font-sans">{t.home.no_servers}</p>
        )}
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground font-sans bg-muted/20">
        <p>{t.home.powered_by}</p>
      </footer>
    </div>
  );
}
