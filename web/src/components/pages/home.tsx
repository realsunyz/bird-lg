import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogIn, UserRound, LogOut, Database } from "lucide-react";
import { DynamicFlag } from "@sankyu/react-circle-flags";
import { useConfig } from "@/contexts/config-context";
import { getLocalizedText } from "@/lib/localized-text";

const navContainerClass = "flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between";
const serverCardIconClass =
  "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-muted/30 group-hover:bg-muted text-foreground transition-colors shrink-0 font-title overflow-hidden";

export default function HomePage() {
  const { t, locale } = useTranslation();
  const config = useConfig();

  return (
    <div className="min-h-dvh bg-background flex flex-col font-sans">
      <div className="border-b bg-card">
        <div className={navContainerClass}>
          <span className="text-lg font-normal font-title tracking-tight">{config.app.title}</span>
          <div className="flex items-center">
            <LanguageSwitcher />
            {config.logto?.endpoint &&
              config.logto?.appId &&
              (config.auth?.isAuthenticated && config.auth?.authType === "sso" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="User menu">
                      <UserRound className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Database className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="/api/auth/logout"
                        className="w-full cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" asChild>
                  <a href="/api/auth/login" aria-label="Login">
                    <LogIn className="h-[1.2rem] w-[1.2rem]" />
                  </a>
                </Button>
              ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
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

      <footer className="border-t py-6 text-center text-sm text-muted-foreground font-sans bg-muted/20">
        <p>{t.home.powered_by}</p>
      </footer>
    </div>
  );
}
