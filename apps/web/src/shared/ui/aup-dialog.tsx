import { Button } from "@/shared/ui/button";
import { ResponsiveDialog } from "@/shared/ui/responsive-dialog";
import { useTranslation } from "@/shared/i18n/provider";
import { cn } from "@/shared/lib/utils";

interface AUPDialogProps {
  mobile?: boolean;
}

export function AUPDialog({ mobile = false }: AUPDialogProps) {
  const { t } = useTranslation();

  return (
    <ResponsiveDialog
      title={t.aup.title}
      content={
        <div className="space-y-5 pr-2 text-sm leading-6">
          {t.aup.sections.map((section) => (
            <section key={section.heading} className="space-y-1.5">
              <h3 className="font-medium">{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      }
    >
      <Button
        variant="link"
        size="sm"
        className={cn(
          "h-auto p-0 font-normal text-muted-foreground hover:text-foreground",
          mobile ? "text-xs" : "text-sm",
        )}
      >
        {mobile ? t.footer.aup_short : t.footer.aup_full}
      </Button>
    </ResponsiveDialog>
  );
}
