import { Button } from "@/shared/ui/button";
import { ErrorDisplay } from "@/shared/ui/error-display";
import { useTranslation } from "@/shared/i18n/provider";

interface DetailLoginRequiredProps {
  loginRedirect: string;
  onCancel: () => void;
}

export function DetailLoginRequired({
  loginRedirect,
  onCancel,
}: DetailLoginRequiredProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col justify-center py-10">
      <ErrorDisplay
        title={t.admin.login_required_title}
        description={t.admin.login_required_description}
        variant="warning"
      >
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <a href={`/api/auth/login?redirect=${encodeURIComponent(loginRedirect)}`}>
              {t.home.account_menu.login}
            </a>
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        </div>
      </ErrorDisplay>
    </div>
  );
}
