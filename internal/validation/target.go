package validation

import (
	"net/netip"
	"strings"
)

var bogonPrefixes = mustParseBogonPrefixes([]string{
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
})

func ValidateToolTarget(raw string) (string, string) {
	target := strings.TrimSpace(raw)
	if target == "" {
		return "", "target_required"
	}
	if strings.ContainsAny(target, " \t\r\n") {
		return "", "target_invalid_format"
	}
	if ip, err := netip.ParseAddr(target); err == nil {
		if isBogonIP(ip) {
			return "", "target_bogon_blocked"
		}
		return ip.String(), ""
	}
	if !isValidDomain(target) {
		return "", "target_invalid_format"
	}
	return strings.ToLower(target), ""
}

func isBogonIP(ip netip.Addr) bool {
	for _, prefix := range bogonPrefixes {
		if prefix.Contains(ip) {
			return true
		}
	}
	return false
}

func mustParseBogonPrefixes(cidrs []string) []netip.Prefix {
	result := make([]netip.Prefix, 0, len(cidrs))
	for _, cidr := range cidrs {
		prefix, err := netip.ParsePrefix(cidr)
		if err != nil {
			panic("invalid bogon prefix: " + cidr)
		}
		result = append(result, prefix)
	}
	return result
}

func isValidDomain(domain string) bool {
	if len(domain) == 0 || len(domain) > 253 {
		return false
	}
	if strings.HasPrefix(domain, ".") || strings.HasSuffix(domain, ".") {
		return false
	}

	labels := strings.Split(domain, ".")
	if len(labels) < 2 {
		return false
	}

	tldHasLetter := false
	for i, label := range labels {
		if len(label) == 0 || len(label) > 63 {
			return false
		}
		first := label[0]
		last := label[len(label)-1]
		if !isDomainAlphaNum(first) || !isDomainAlphaNum(last) {
			return false
		}
		for j := 0; j < len(label); j++ {
			ch := label[j]
			if !(isDomainAlphaNum(ch) || ch == '-') {
				return false
			}
			if i == len(labels)-1 && isDomainLetter(ch) {
				tldHasLetter = true
			}
		}
	}
	return tldHasLetter
}

func isDomainAlphaNum(ch byte) bool {
	return isDomainLetter(ch) || (ch >= '0' && ch <= '9')
}

func isDomainLetter(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}
