import type { ReactNode } from "react";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { LanguageSwitcher } from "@/shared/ui/language-switcher";
import { Badge } from "@/shared/ui/badge";
import { Logo } from "@/shared/ui/logo";

interface AppHeaderProps {
  rightExtra?: ReactNode;
}

export function AppHeader({ rightExtra }: AppHeaderProps) {
  return (
    <div className="border-b bg-card">
      <div className="flex h-16 items-center pl-7 pr-4 sm:pl-7 sm:pr-4 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-4" />
          <Badge variant="secondary" className="shrink-0">
            <span className="sm:hidden">LG</span>
            <span className="hidden sm:inline">Looking Glass</span>
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          {rightExtra}
        </div>
      </div>
    </div>
  );
}
