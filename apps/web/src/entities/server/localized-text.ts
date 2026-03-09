import { type Locale } from "@/shared/i18n/dictionaries";
import { type LocalizedText } from "@/entities/server/types";

export function getLocalizedText(value: LocalizedText | undefined, locale: Locale): string {
  if (!value) return "";
  const en = value.en?.trim() || "";
  const zh = value.zh?.trim() || "";
  if (locale === "zh") return zh || en;
  return en || zh;
}
