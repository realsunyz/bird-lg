import {
  AlertCircle,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ErrorDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorDisplay({
  title,
  description,
  icon: Icon,
  variant = "destructive",
  className,
  children,
  ...props
}: ErrorDisplayProps) {
  let DefaultIcon = AlertCircle;
  let iconColor = "text-destructive";

  if (variant === "warning") {
    DefaultIcon = AlertTriangle;
    iconColor = "text-yellow-600 dark:text-yellow-500";
  } else if (variant === "default") {
    DefaultIcon = XCircle;
    iconColor = "text-muted-foreground";
  }

  const RenderIcon = Icon || DefaultIcon;

  return (
    <div
      className={cn(
        "flex-1 w-full flex flex-col items-center justify-center bg-background px-4 py-8 text-center",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center max-w-md w-full space-y-4">
        <div
          className={cn(
            "p-4 rounded-full bg-muted/50 dark:bg-muted/20 ring-1 ring-border shadow-sm",
            iconColor,
          )}
        >
          <RenderIcon className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </div>
        </div>
        {children && <div className="pt-4">{children}</div>}
      </div>
    </div>
  );
}
