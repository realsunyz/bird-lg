export type TargetValidationErrorKey =
  | "target_required"
  | "target_invalid_format"
  | "target_bogon_blocked";

type TargetValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; errorKey: TargetValidationErrorKey };

const ipv4BogonPrefixes: Array<[number, number]> = [
  [ipv4ToUint32("0.0.0.0"), 8],
  [ipv4ToUint32("10.0.0.0"), 8],
  [ipv4ToUint32("100.64.0.0"), 10],
  [ipv4ToUint32("127.0.0.0"), 8],
  [ipv4ToUint32("169.254.0.0"), 16],
  [ipv4ToUint32("172.16.0.0"), 12],
  [ipv4ToUint32("192.0.2.0"), 24],
  [ipv4ToUint32("192.168.0.0"), 16],
  [ipv4ToUint32("198.18.0.0"), 15],
  [ipv4ToUint32("198.51.100.0"), 24],
  [ipv4ToUint32("203.0.113.0"), 24],
  [ipv4ToUint32("224.0.0.0"), 4],
  [ipv4ToUint32("240.0.0.0"), 4],
];

export function validateTargetInput(raw: string): TargetValidationResult {
  const target = raw.trim();
  if (target.length === 0) {
    return { ok: false, errorKey: "target_required" };
  }

  if (containsWhitespace(target)) {
    return { ok: false, errorKey: "target_invalid_format" };
  }

  if (isValidIPv4(target)) {
    if (isIPv4Bogon(target)) {
      return { ok: false, errorKey: "target_bogon_blocked" };
    }
    return { ok: true, normalized: target };
  }

  if (isValidIPv6(target)) {
    return { ok: true, normalized: target.toLowerCase() };
  }

  if (!isValidDomain(target)) {
    return { ok: false, errorKey: "target_invalid_format" };
  }

  return { ok: true, normalized: target.toLowerCase() };
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

function isValidIPv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;

  for (const part of parts) {
    if (part.length === 0 || part.length > 3) return false;
    if (part.length > 1 && part[0] === "0") return false;

    let number = 0;
    for (let i = 0; i < part.length; i++) {
      const code = part.charCodeAt(i);
      if (code < 48 || code > 57) return false;
      number = number * 10 + (code - 48);
    }

    if (number > 255) return false;
  }

  return true;
}

function ipv4ToUint32(value: string): number {
  const parts = value.split(".").map((part) => Number(part));
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  ) >>> 0;
}

function isIPv4Bogon(value: string): boolean {
  const ip = ipv4ToUint32(value);
  for (const [prefixIP, prefixLen] of ipv4BogonPrefixes) {
    const shift = 32 - prefixLen;
    if ((ip >>> shift) === (prefixIP >>> shift)) {
      return true;
    }
  }
  return false;
}

function isValidIPv6(value: string): boolean {
  if (value.indexOf(":") === -1) return false;
  try {
    new URL(`http://[${value}]/`);
    return true;
  } catch {
    return false;
  }
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
