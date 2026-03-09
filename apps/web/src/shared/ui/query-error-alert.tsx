import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { useTranslation } from "@/shared/i18n/provider";

export function QueryErrorAlert({ message }: { message: string }) {
  const { t } = useTranslation();
  if (!message) return null;

  const translatedMessage =
    message in t.error ? t.error[message as keyof typeof t.error] : message;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t.error.title}</AlertTitle>
      <AlertDescription>{translatedMessage}</AlertDescription>
    </Alert>
  );
}

