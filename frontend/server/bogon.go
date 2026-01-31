package main

import (
	"net"
	"strconv"
	"strings"

	"github.com/wasilibs/go-re2"
)

type BogonResult struct {
	IsBogon   bool              `json:"isBogon"`
	ReasonKey string            `json:"reasonKey,omitempty"`
	Params    map[string]string `json:"params,omitempty"`
}

var bogonASNRanges = [][2]int64{
	{0, 0},
	{23456, 23456},
	{64496, 64511},
	{64512, 65534},
	{65535, 65535},
	{65536, 65551},
	{65552, 131071},
	{4200000000, 4294967294},
	{4294967295, 4294967295},
}

var bogonIPv4CIDRs = []string{
	"0.0.0.0/8",
	"10.0.0.0/8",
	"100.64.0.0/10",
	"127.0.0.0/8",
	"169.254.0.0/16",
	"172.16.0.0/12",
	"192.0.2.0/24",
	"192.88.99.0/24",
	"192.168.0.0/16",
	"198.18.0.0/15",
	"198.51.100.0/24",
	"203.0.113.0/24",
	"224.0.0.0/4",
	"240.0.0.0/4",
}

var bogonIPv6CIDRs = []string{
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
}

var asnRegex = re2.MustCompile(`(?i)^AS?(\d+)$`)

func CheckBogon(query string) BogonResult {
	q := strings.TrimSpace(query)

	// Check ASN
	if match := asnRegex.FindStringSubmatch(q); match != nil {
		asn, _ := strconv.ParseInt(match[1], 10, 64)
		for _, r := range bogonASNRanges {
			if asn >= r[0] && asn <= r[1] {
				return BogonResult{
					IsBogon:   true,
					ReasonKey: "bogon_asn",
					Params:    map[string]string{"asn": match[1]},
				}
			}
		}
		return BogonResult{IsBogon: false}
	}

	// Check IPv4
	if ip := net.ParseIP(q); ip != nil {
		if ip4 := ip.To4(); ip4 != nil {
			for _, cidr := range bogonIPv4CIDRs {
				_, network, _ := net.ParseCIDR(cidr)
				if network.Contains(ip4) {
					return BogonResult{
						IsBogon:   true,
						ReasonKey: "bogon_ip",
						Params:    map[string]string{"ip": q},
					}
				}
			}
			return BogonResult{IsBogon: false}
		}

		// IPv6
		for _, cidr := range bogonIPv6CIDRs {
			_, network, _ := net.ParseCIDR(cidr)
			if network.Contains(ip) {
				return BogonResult{
					IsBogon:   true,
					ReasonKey: "bogon_ip",
					Params:    map[string]string{"ip": q},
				}
			}
		}
		return BogonResult{IsBogon: false}
	}

	// Try parsing as IPv6 with :: expansion
	if strings.Contains(q, ":") {
		ip := net.ParseIP(q)
		if ip != nil {
			for _, cidr := range bogonIPv6CIDRs {
				_, network, _ := net.ParseCIDR(cidr)
				if network.Contains(ip) {
					return BogonResult{
						IsBogon:   true,
						ReasonKey: "bogon_ip",
						Params:    map[string]string{"ip": q},
					}
				}
			}
		}
	}

	return BogonResult{IsBogon: false}
}
