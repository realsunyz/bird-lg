import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  rightExtra?: ReactNode;
}

export function AppHeader({ rightExtra }: AppHeaderProps) {
  return (
    <div className="border-b bg-card">
      <div className="flex h-16 items-center pl-7 pr-4 sm:pl-7 sm:pr-4 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Sunyz Network" className="h-4 w-auto" />
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
