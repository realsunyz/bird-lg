import { Link } from "react-router-dom";
import { Shield, LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useTranslation } from "@/shared/i18n/provider";
import { useConfig } from "@/entities/server/config-context";

export function AccountActions() {
  const { t } = useTranslation();
  const config = useConfig();
  const hasSSO = Boolean(config.logto?.endpoint && config.logto?.appId);

  if (!hasSSO) {
    return null;
  }

  if (config.auth?.isAuthenticated && config.auth?.authType === "sso") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t.home.account_menu.user_menu}>
            <UserRound className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t.home.account_menu.my_account}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield className="mr-2 h-4 w-4" />
              <span>{t.home.account_menu.admin}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/auth/logout" className="w-full cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t.home.account_menu.logout}</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button variant="ghost" size="icon" asChild>
      <a href="/api/auth/login" aria-label={t.home.account_menu.login}>
        <LogIn className="h-[1.2rem] w-[1.2rem]" />
      </a>
    </Button>
  );
}
