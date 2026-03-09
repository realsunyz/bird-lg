import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ThemeToggler } from "@/shared/ui/animate-ui/primitives/effects/theme-toggler";
import { useTheme } from "@/shared/ui/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const resolvedTheme =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  return (
    <ThemeToggler theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme}>
      {({ effective, toggleTheme }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (effective === "system") toggleTheme("dark");
            else if (effective === "dark") toggleTheme("light");
            else toggleTheme("system");
          }}
        >
          {effective === "system" ? (
            <Monitor className="h-[1.2rem] w-[1.2rem]" />
          ) : effective === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
        </Button>
      )}
    </ThemeToggler>
  );
}
