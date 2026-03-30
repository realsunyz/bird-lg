import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/shared/ui/app-header";
import { AccountActions } from "@/shared/ui/account-actions";
import { useConfig } from "@/entities/server/config-context";
import { getLocalizedText } from "@/entities/server/localized-text";
import { useTranslation } from "@/shared/i18n/provider";
import { Button } from "@/shared/ui/button";
import { ErrorDisplay } from "@/shared/ui/error-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { QueryErrorAlert } from "@/shared/ui/query-error-alert";
import { type PopVersionsResponse, type PopVersionInfo } from "@/entities/server/types";

function isPopVersionsResponse(value: unknown): value is PopVersionsResponse {
  if (!value || typeof value !== "object") return false;
  const pops = (value as { pops?: unknown }).pops;
  if (!Array.isArray(pops)) return false;

  return pops.every((item) => {
    if (!item || typeof item !== "object") return false;
    const typed = item as Partial<PopVersionInfo>;
    if (typeof typed.serverId !== "string") return false;
    if (typed.version !== undefined && typeof typed.version !== "string") return false;
    if (typed.build !== undefined && typeof typed.build !== "string") return false;
    if (typed.error !== undefined && typeof typed.error !== "string") return false;
    return true;
  });
}

export default function AdminPage() {
  const { t, locale } = useTranslation();
  const config = useConfig();
  const isSSO = config.auth?.isAuthenticated && config.auth?.authType === "sso";
  const [pops, setPops] = useState<PopVersionInfo[]>([]);
  const [loading, setLoading] = useState(isSSO);
  const [error, setError] = useState("");

  const serverMap = useMemo(
    () => new Map(config.servers.map((server) => [server.id, server])),
    [config.servers],
  );
  const incompatibleMessage = t.admin.messages.incompatible;

  useEffect(() => {
    if (!isSSO) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/pops", { signal: controller.signal });
        const payload: unknown = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "unknown_error";
          throw new Error(message);
        }

        if (!isPopVersionsResponse(payload)) {
          throw new Error("unknown_error");
        }

        setPops(payload.pops);
      } catch (err) {
        if (controller.signal.aborted) return;
        setPops([]);
        setError(err instanceof Error ? err.message : "unknown_error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [isSSO]);

  if (!isSSO) {
    return (
      <div className="flex-1 bg-background flex flex-col font-sans">
        <AppHeader rightExtra={<AccountActions />} />
        <ErrorDisplay
          title={t.admin.login_required_title}
          description={t.admin.login_required_description}
          variant="warning"
        >
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <a href={`/api/auth/login?redirect=${encodeURIComponent("/admin")}`}>
                {t.home.account_menu.login}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">{t.common.back_to_home}</Link>
            </Button>
          </div>
        </ErrorDisplay>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col font-sans">
      <AppHeader rightExtra={<AccountActions />} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="font-title text-3xl text-foreground">{t.admin.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.admin.description}</p>
        </div>

        <QueryErrorAlert message={error} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.admin.table_title}</CardTitle>
            <CardDescription>{t.admin.table_description}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">{t.common.loading}</div>
            ) : (
              <div className="overflow-hidden rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.columns.pop}</TableHead>
                      <TableHead>{t.admin.columns.version}</TableHead>
                      <TableHead>{t.admin.columns.build}</TableHead>
                      <TableHead>{t.admin.columns.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pops.map((item) => {
                      const server = serverMap.get(item.serverId);
                      const name = server ? getLocalizedText(server.name, locale) : item.serverId;
                      const descr = server ? getLocalizedText(server.descr, locale) : item.serverId;
                      const isIncompatible = item.error === "incompatible_client";
                      const isAvailable = !item.error;
                      const statusLabel = isAvailable
                        ? t.admin.status.available
                        : isIncompatible
                          ? t.admin.status.incompatible
                          : t.admin.status.unavailable;
                      const detailMessage = isIncompatible ? incompatibleMessage : item.error;
                      const availableBadgeClass =
                        "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/50";
                      const incompatibleBadgeClass =
                        "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/50";

                      return (
                        <TableRow key={item.serverId}>
                          <TableCell className="min-w-56">
                            <div className="font-medium text-foreground">{name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{descr}</div>
                          </TableCell>
                          <TableCell>{item.version || "-"}</TableCell>
                          <TableCell className="font-mono">{item.build || "-"}</TableCell>
                          <TableCell className="min-w-48">
                            <div className="flex flex-col gap-2">
                              <Badge
                                variant={
                                  isAvailable
                                    ? "secondary"
                                    : isIncompatible
                                      ? "outline"
                                      : "destructive"
                                }
                                className={
                                  isAvailable
                                    ? availableBadgeClass
                                    : isIncompatible
                                      ? incompatibleBadgeClass
                                      : undefined
                                }
                              >
                                {statusLabel}
                              </Badge>
                              {detailMessage ? (
                                <span className="text-xs text-muted-foreground">{detailMessage}</span>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
