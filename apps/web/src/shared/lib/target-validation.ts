import * as ipaddr from "ipaddr.js";

export type TargetValidationErrorKey =
  | "target_required"
  | "target_invalid_format"
  | "target_bogon_blocked";

type TargetValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; errorKey: TargetValidationErrorKey };

const bogonPrefixes = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "100::/64",
  "2001:2::/48",
  "2001:10::/28",
  "2001:db8::/32",
  "2002::/16",
  "3ffe::/16",
  "3fff::/20",
  "5f00::/16",
  "fc00::/7",
  "fe80::/10",
  "fec0::/10",
  "ff00::/8",
] as const;

const parsedBogonPrefixes = bogonPrefixes.map((cidr) => ipaddr.parseCIDR(cidr));

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
      if (isBogonIP(parsed)) {
        return { ok: false, errorKey: "target_bogon_blocked" };
      }
      return { ok: true, normalized: parsed.toNormalizedString() };
    } catch {
      return { ok: false, errorKey: "target_invalid_format" };
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

function isBogonIP(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
  for (const prefix of parsedBogonPrefixes) {
    if (addr.kind() !== prefix[0].kind()) continue;
    if (addr.match(prefix)) return true;
  }
  return false;
}

function isValidDomain(value: string): boolean {
  if (value.length === 0 || value.length > 253) return false;
  if (value.startsWith(".") || value.endsWith(".")) return false;

  const labels = value.split(".");
  if (labels.length < 2) return false;

  let tldHasLetter = false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label.length === 0 || label.length > 63) return false;

    const first = label[0];
    const last = label[label.length - 1];
    if (!isDomainAlphaNum(first) || !isDomainAlphaNum(last)) {
      return false;
    }

    for (let j = 0; j < label.length; j++) {
      const ch = label[j];
      if (!(isDomainAlphaNum(ch) || ch === "-")) {
        return false;
      }
      if (i === labels.length - 1 && isDomainLetter(ch)) {
        tldHasLetter = true;
      }
    }
  }

  return tldHasLetter;
}

function isDomainAlphaNum(ch: string): boolean {
  return isDomainLetter(ch) || (ch >= "0" && ch <= "9");
}

function isDomainLetter(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}
