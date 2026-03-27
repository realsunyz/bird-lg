package tool

import (
	"bytes"
	"fmt"
	"io"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"bird-lg/server/internal/server/domain/model"
	errx "bird-lg/server/internal/server/platform/errors"
	"bird-lg/server/internal/server/platform/logx"
	apiclient "bird-lg/server/internal/server/platform/upstream"
	"github.com/gofiber/fiber/v3"
	maxminddb "github.com/oschwald/maxminddb-golang/v2"
)

const maxTraceIPInfoIPs = 64
const traceIPInfoTokenEnv = "IPINFO_TOKEN"

type traceIPInfoRecord struct {
	ASN         string `maxminddb:"asn"`
	ASName      string `maxminddb:"as_name"`
	Country     string `maxminddb:"country"`
	CountryCode string `maxminddb:"country_code"`
}

type traceIPInfoCacheRecord struct {
	ASN         string
	ASName      string
	Country     string
	CountryCode string
}

var (
	traceIPInfoDBOnce sync.Once
	traceIPInfoDB     *maxminddb.Reader
	traceIPInfoDBErr  error
	traceIPInfoCache  sync.Map
)

func (s *Service) LookupTraceIPInfo(ips []string) (model.TraceIPInfoResponse, int, string) {
	items := make(map[string]model.TraceIPMetadata)
	if len(ips) == 0 {
		return model.TraceIPInfoResponse{Items: items}, fiber.StatusBadRequest, errx.PublicErrorFromKey("invalid_request")
	}

	type parsedTraceIP struct {
		raw  string
		addr netip.Addr
	}

	parsedIPs := make([]parsedTraceIP, 0, len(ips))
	seen := make(map[string]struct{}, len(ips))
	for _, rawIP := range ips {
		ip := strings.TrimSpace(rawIP)
		if ip == "" {
			continue
		}
		if _, ok := seen[ip]; ok {
			continue
		}
		addr, err := netip.ParseAddr(ip)
		if err != nil {
			continue
		}
		seen[ip] = struct{}{}
		parsedIPs = append(parsedIPs, parsedTraceIP{raw: ip, addr: addr})
		if len(parsedIPs) >= maxTraceIPInfoIPs {
			break
		}
	}

	if len(parsedIPs) == 0 {
		return model.TraceIPInfoResponse{Items: items}, fiber.StatusBadRequest, errx.PublicErrorFromKey("invalid_request")
	}

	db, err := openTraceIPInfoDB()
	if err != nil {
		logx.Warnf("trace ipinfo unavailable: %v", err)
		return model.TraceIPInfoResponse{Items: items}, fiber.StatusInternalServerError, errx.FormatPublicError("ERR-SERVER-500-IPINFO", "Trace IP info unavailable")
	}

	for _, entry := range parsedIPs {
		result := db.Lookup(entry.addr)
		if err := result.Err(); err != nil {
			continue
		}

		offset := result.Offset()
		if cached, ok := traceIPInfoCache.Load(offset); ok {
			record := cached.(traceIPInfoCacheRecord)
			items[entry.raw] = model.TraceIPMetadata{
				IP:          entry.raw,
				ASN:         record.ASN,
				ASName:      record.ASName,
				Country:     record.Country,
				CountryCode: record.CountryCode,
			}
			continue
		}

		var record traceIPInfoRecord
		if err := result.Decode(&record); err != nil {
			continue
		}

		if record.ASN == "" && record.ASName == "" && record.Country == "" && record.CountryCode == "" {
			continue
		}

		cached := traceIPInfoCacheRecord{
			ASN:         record.ASN,
			ASName:      record.ASName,
			Country:     record.Country,
			CountryCode: strings.ToUpper(record.CountryCode),
		}
		traceIPInfoCache.Store(offset, cached)

		items[entry.raw] = model.TraceIPMetadata{
			IP:          entry.raw,
			ASN:         cached.ASN,
			ASName:      cached.ASName,
			Country:     cached.Country,
			CountryCode: cached.CountryCode,
		}
	}

	return model.TraceIPInfoResponse{Items: items}, 0, ""
}

func openTraceIPInfoDB() (*maxminddb.Reader, error) {
	traceIPInfoDBOnce.Do(func() {
		candidates := traceIPInfoDBPaths()
		if token := strings.TrimSpace(os.Getenv(traceIPInfoTokenEnv)); token != "" {
			if path, err := downloadTraceIPInfoDB(token, candidates); err != nil {
				logx.Warnf("failed to download trace ipinfo database: %v", err)
			} else {
				logx.Infof("Downloaded trace ipinfo database to %s", path)
			}
		}

		for _, candidate := range candidates {
			if _, err := os.Stat(candidate); err != nil {
				continue
			}

			traceIPInfoDB, traceIPInfoDBErr = maxminddb.Open(candidate)
			if traceIPInfoDBErr == nil {
				traceIPInfoCache = sync.Map{}
				logx.Infof("Loaded trace ipinfo database from %s", candidate)
				return
			}
		}

		traceIPInfoDBErr = fmt.Errorf("ipinfo.mmdb not found in any known path")
	})

	return traceIPInfoDB, traceIPInfoDBErr
}

func downloadTraceIPInfoDB(token string, candidates []string) (string, error) {
	targetPath := preferredTraceIPInfoDBPath(candidates)
	if targetPath == "" {
		return "", fmt.Errorf("no writable ipinfo.mmdb path available")
	}

	endpoint, err := url.Parse("https://ipinfo.io/data/ipinfo_lite.mmdb")
	if err != nil {
		return "", err
	}
	query := endpoint.Query()
	query.Set("_src", "frontend")
	query.Set("token", token)
	endpoint.RawQuery = query.Encode()

	cc := apiclient.NewHTTPClient()
	req := cc.R()
	req.SetTimeout(30 * time.Second)
	resp, err := req.Get(endpoint.String())
	if err != nil {
		return "", err
	}

	if resp.StatusCode() != fiber.StatusOK {
		return "", fmt.Errorf("ipinfo download failed with status %d", resp.StatusCode())
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return "", err
	}

	tempPath := targetPath + ".tmp"
	file, err := os.Create(tempPath)
	if err != nil {
		return "", err
	}

	copyErr := error(nil)
	if _, err := io.Copy(file, bytes.NewReader(resp.Body())); err != nil {
		copyErr = err
	}
	closeErr := file.Close()
	if copyErr != nil {
		_ = os.Remove(tempPath)
		return "", copyErr
	}
	if closeErr != nil {
		_ = os.Remove(tempPath)
		return "", closeErr
	}
	if err := os.Rename(tempPath, targetPath); err != nil {
		_ = os.Remove(tempPath)
		return "", err
	}

	return targetPath, nil
}

func traceIPInfoDBPaths() []string {
	candidates := make([]string, 0, 16)
	seen := make(map[string]struct{}, 16)
	appendWalk := func(base string) {
		if base == "" {
			return
		}
		current := base
		for {
			candidate := filepath.Join(current, "data", "ipinfo.mmdb")
			if _, ok := seen[candidate]; !ok {
				seen[candidate] = struct{}{}
				candidates = append(candidates, candidate)
			}

			parent := filepath.Dir(current)
			if parent == current {
				break
			}
			current = parent
		}
	}

	if cwd, err := os.Getwd(); err == nil {
		appendWalk(cwd)
	}
	if executable, err := os.Executable(); err == nil {
		appendWalk(filepath.Dir(executable))
	}

	return candidates
}

func preferredTraceIPInfoDBPath(candidates []string) string {
	for _, candidate := range candidates {
		dir := filepath.Dir(candidate)
		if stat, err := os.Stat(dir); err == nil && stat.IsDir() {
			return candidate
		}
	}
	if len(candidates) == 0 {
		return ""
	}
	return candidates[0]
}
