import { Link } from "react-router-dom";
import { Card, CardContent } from "@/shared/ui/card";
import { useTranslation } from "@/shared/i18n/provider";
import { DynamicFlag } from "@sankyu/react-circle-flags";
import { useConfig } from "@/entities/server/config-context";
import { getLocalizedText } from "@/entities/server/localized-text";
import { AppHeader } from "@/shared/ui/app-header";
import { AccountActions } from "@/shared/ui/account-actions";

const serverCardIconClass =
  "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-muted/30 group-hover:bg-muted text-foreground transition-colors shrink-0 font-title overflow-hidden";

export default function HomePage() {
  const { t, locale } = useTranslation();
  const config = useConfig();

  return (
    <div className="flex-1 bg-background flex flex-col font-sans">
      <AppHeader rightExtra={<AccountActions />} />

      <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 md:py-8">
        <h1 className="text-4xl font-normal font-title mb-2 text-foreground flex items-center justify-center">
          {t.home.title}
        </h1>
        <p className="text-muted-foreground mb-8 text-lg font-sans">{t.home.select_server}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {config.servers.map((server) => {
            const displayName = getLocalizedText(server.name, locale);
            const displayDescr = getLocalizedText(server.descr, locale);

            return (
              <Link key={server.id} to={`/detail/${server.id}`} className="block group">
                <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={serverCardIconClass}>
                        {server.icon && server.icon.length === 2 ? (
                          <DynamicFlag
                            code={server.icon.toLowerCase()}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-medium">
                            {server.icon ||
                              displayName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-normal font-title leading-tight mb-1">
                          {displayName}
                        </h2>
                        <p className="text-sm text-muted-foreground font-sans line-clamp-1">
                          {displayDescr}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {config.servers.length === 0 && (
          <p className="text-yellow-600 mt-4 font-sans">{t.home.no_servers}</p>
        )}
      </div>

    </div>
  );
}
