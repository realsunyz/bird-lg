import * as ipaddr from "ipaddr.js";

export type TargetValidationErrorKey =
  | "target_required"
  | "target_invalid_format"
  | "target_bogon_blocked";

type TargetValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; errorKey: TargetValidationErrorKey };

export function validateTargetInput(raw: string): TargetValidationResult {
  const target = raw.trim();
  if (target.length === 0) {
    return { ok: false, errorKey: "target_required" };
  }

  if (containsWhitespace(target)) {
    return { ok: false, errorKey: "target_invalid_format" };
  }

  if (ipaddr.isValid(target)) {
    try {
      const parsed = ipaddr.parse(target);
      if (parsed.kind() === "ipv4") {
        if (parsed.range() !== "unicast") {
          return { ok: false, errorKey: "target_bogon_blocked" };
        }
      }
      return { ok: true, normalized: target.toLowerCase() };
    } catch {
      // Fallback in case of parse error despite validation
    }
  }

  if (!isValidDomain(target)) {
    return { ok: false, errorKey: "target_invalid_format" };
  }

  return { ok: true, normalized: target.toLowerCase() };
}

export function isIP(value: string): boolean {
  return ipaddr.isValid(value);
}

export function extractErrorCode(message: string): string | undefined {
  const trimmed = trimTrailingPunctuation(message.trim());
  if (trimmed.startsWith("ERR-")) {
    return trimmed;
  }

  const end = trimmed.lastIndexOf(")");
  if (end < 0) return undefined;

  const start = trimmed.lastIndexOf("(", end);
  if (start < 0 || start >= end - 1) return undefined;

  const code = trimmed.slice(start + 1, end).trim();
  if (!code.startsWith("ERR-")) return undefined;

  return code;
}

function trimTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0) {
    const ch = value[end - 1];
    if (ch === "." || ch === ")" || ch === "。" || ch === "！" || ch === "!") {
      end--;
      continue;
    }
    break;
  }
  return value.slice(0, end);
}

function containsWhitespace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      return true;
    }
  }
  return false;
}



function isValidDomain(value: string): boolean {
  if (value.length === 0 || value.length > 253) return false;
  if (value.startsWith(".") || value.endsWith(".")) return false;

  const labels = value.split(".");
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  let tldHasLetter = false;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;

    if (!isAlphaNumeric(label[0]) || !isAlphaNumeric(label[label.length - 1])) {
      return false;
    }

    for (let i = 0; i < label.length; i++) {
      const ch = label[i];
      if (!(isAlphaNumeric(ch) || ch === "-")) return false;
    }
  }

  for (let i = 0; i < tld.length; i++) {
    if (isLetter(tld[i])) {
      tldHasLetter = true;
      break;
    }
  }

  return tldHasLetter;
}

function isAlphaNumeric(ch: string): boolean {
  return isLetter(ch) || (ch >= "0" && ch <= "9");
}

function isLetter(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}
