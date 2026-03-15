import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

interface ResponsiveDialogProps {
  children: ReactNode;
  content: ReactNode;
  title: string;
  description?: string;
}

export function ResponsiveDialog({
  children,
  content,
  title,
  description,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="max-h-[85dvh] overflow-hidden p-0 sm:max-w-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-2 pr-14 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="max-h-[calc(85dvh-4.5rem)] overflow-y-auto px-6 pb-6">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[85dvh] overflow-hidden">
        <DrawerHeader className="px-6 pt-6 pb-2 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="max-h-[calc(85dvh-4.5rem)] overflow-y-auto px-6 pb-8 pt-0">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
