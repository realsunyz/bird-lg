const BOGON_ASN_RANGES: Array<[number, number]> = [
  [0, 0],
  [23456, 23456],
  [64496, 64511],
  [64512, 65534],
  [65535, 65535],
  [65536, 65551],
  [65552, 131071],
  [4200000000, 4294967294],
  [4294967295, 4294967295],
];

const BOGON_IPV4_CIDRS = [
  { prefix: "0.0.0.0", bits: 8 },
  { prefix: "10.0.0.0", bits: 8 },
  { prefix: "100.64.0.0", bits: 10 },
  { prefix: "127.0.0.0", bits: 8 },
  { prefix: "169.254.0.0", bits: 16 },
  { prefix: "172.16.0.0", bits: 12 },
  { prefix: "192.0.2.0", bits: 24 },
  { prefix: "192.88.99.0", bits: 24 },
  { prefix: "192.168.0.0", bits: 16 },
  { prefix: "198.18.0.0", bits: 15 },
  { prefix: "198.51.100.0", bits: 24 },
  { prefix: "203.0.113.0", bits: 24 },
  { prefix: "224.0.0.0", bits: 4 },
  { prefix: "240.0.0.0", bits: 4 },
];

const BOGON_IPV6_CIDRS = [
  "::/8",
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/32",
  "2001:2::/48",
  "2001:10::/28",
  "2001:db8::/32",
  "2002::/16",
  "3ffe::/16",
  "5f00::/8",
  "fc00::/7",
  "fe80::/10",
  "fec0::/10",
  "ff00::/8",
];

function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function isIPv4InCIDR(ip: string, prefix: string, bits: number): boolean {
  const ipNum = ipv4ToNumber(ip);
  const prefixNum = ipv4ToNumber(prefix);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (prefixNum & mask);
}

function expandIPv6(ip: string): string | null {
  let parts = ip.split("::");
  if (parts.length > 2) return null;

  let left = parts[0] ? parts[0].split(":") : [];
  let right = parts.length > 1 && parts[1] ? parts[1].split(":") : [];

  const missing = 8 - left.length - right.length;
  const middle = Array(missing).fill("0000");

  const full = [...left, ...middle, ...right].map((s) => s.padStart(4, "0"));
  return full.join(":");
}

function isIPv6InCIDR(ip: string, cidr: string): boolean {
  const [prefix, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);

  const expandedIP = expandIPv6(ip.toLowerCase());
  const expandedPrefix = expandIPv6(prefix.toLowerCase());

  if (!expandedIP || !expandedPrefix) return false;

  const ipHex = expandedIP.replace(/:/g, "");
  const prefixHex = expandedPrefix.replace(/:/g, "");

  const fullBytes = Math.floor(bits / 4);
  const remainder = bits % 4;

  if (ipHex.slice(0, fullBytes) !== prefixHex.slice(0, fullBytes)) return false;

  if (remainder > 0 && fullBytes < ipHex.length) {
    const ipNibble = parseInt(ipHex[fullBytes], 16);
    const prefixNibble = parseInt(prefixHex[fullBytes], 16);
    const mask = (0xf << (4 - remainder)) & 0xf;
    if ((ipNibble & mask) !== (prefixNibble & mask)) return false;
  }

  return true;
}

export interface BogonCheckResult {
  isBogon: boolean;
  type?: "asn" | "ipv4" | "ipv6";
  reasonKey?: "bogon_asn" | "bogon_ip";
  params?: Record<string, string | number>;
}

export function checkBogon(query: string): BogonCheckResult {
  const q = query.trim().toUpperCase();

  // Check ASN
  const asnMatch = q.match(/^AS?(\d+)$/i);
  if (asnMatch) {
    const asn = parseInt(asnMatch[1], 10);
    for (const [min, max] of BOGON_ASN_RANGES) {
      if (asn >= min && asn <= max) {
        return {
          isBogon: true,
          type: "asn",
          reasonKey: "bogon_asn",
          params: { asn },
        };
      }
    }
    return { isBogon: false };
  }

  // Check IPv4
  const ipv4Match = q.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    const ip = ipv4Match[1];
    for (const { prefix, bits } of BOGON_IPV4_CIDRS) {
      if (isIPv4InCIDR(ip, prefix, bits)) {
        return {
          isBogon: true,
          type: "ipv4",
          reasonKey: "bogon_ip",
          params: { ip },
        };
      }
    }
    return { isBogon: false };
  }

  // Check IPv6
  if (q.includes(":")) {
    for (const cidr of BOGON_IPV6_CIDRS) {
      if (isIPv6InCIDR(q, cidr)) {
        return {
          isBogon: true,
          type: "ipv6",
          reasonKey: "bogon_ip",
          params: { ip: query },
        };
      }
    }
    return { isBogon: false };
  }

  return { isBogon: false };
}
