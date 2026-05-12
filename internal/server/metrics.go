package server

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var httpDurationBuckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}

type Metrics struct {
	mu           sync.Mutex
	requests     map[metricKey]uint64
	bytes        map[metricKey]uint64
	duration     map[metricKey]durationMetric
	memosCreated uint64
	memosRead    uint64
}

type metricKey struct {
	Method  string
	Route   string
	Status  string
	Country string
}

type durationMetric struct {
	Count   uint64
	Sum     float64
	Buckets []uint64
}

type metricsResponseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func NewMetrics() *Metrics {
	return &Metrics{
		requests: make(map[metricKey]uint64),
		bytes:    make(map[metricKey]uint64),
		duration: make(map[metricKey]durationMetric),
	}
}

func (m *Metrics) Observe(r *http.Request, status int, bytes int, elapsed time.Duration) {
	if m == nil || r == nil {
		return
	}
	key := metricKey{
		Method:  metricMethod(r.Method),
		Route:   metricRoute(r.URL.Path),
		Status:  strconv.Itoa(status),
		Country: metricCountry(r),
	}
	seconds := elapsed.Seconds()

	m.mu.Lock()
	defer m.mu.Unlock()

	m.requests[key]++
	if status == http.StatusOK && r.Method == http.MethodPost {
		switch key.Route {
		case "/api/create-memo":
			m.memosCreated++
		case "/api/read-memo":
			m.memosRead++
		}
	}
	if bytes > 0 {
		m.bytes[key] += uint64(bytes)
	}
	d := m.duration[key]
	if d.Buckets == nil {
		d.Buckets = make([]uint64, len(httpDurationBuckets))
	}
	d.Count++
	d.Sum += seconds
	for i, bucket := range httpDurationBuckets {
		if seconds <= bucket {
			d.Buckets[i]++
		}
	}
	m.duration[key] = d
}

func (m *Metrics) Handler() http.Handler {
	return http.HandlerFunc(m.ServeHTTP)
}

func (m *Metrics) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/metrics" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	if r.Method == http.MethodHead {
		return
	}

	m.mu.Lock()
	requests := cloneUintMetrics(m.requests)
	bytes := cloneUintMetrics(m.bytes)
	durations := cloneDurationMetrics(m.duration)
	memosCreated := m.memosCreated
	memosRead := m.memosRead
	m.mu.Unlock()

	fmt.Fprintln(w, "# HELP securememo_http_requests_total Total HTTP requests handled by securememo.app.")
	fmt.Fprintln(w, "# TYPE securememo_http_requests_total counter")
	for _, key := range sortedKeys(requests) {
		fmt.Fprintf(w, "securememo_http_requests_total%s %d\n", key.labels(), requests[key])
	}

	fmt.Fprintln(w, "# HELP securememo_http_response_bytes_total Total HTTP response bytes written by securememo.app.")
	fmt.Fprintln(w, "# TYPE securememo_http_response_bytes_total counter")
	for _, key := range sortedKeys(bytes) {
		fmt.Fprintf(w, "securememo_http_response_bytes_total%s %d\n", key.labels(), bytes[key])
	}

	fmt.Fprintln(w, "# HELP securememo_memos_created_total Total successfully created memos.")
	fmt.Fprintln(w, "# TYPE securememo_memos_created_total counter")
	fmt.Fprintf(w, "securememo_memos_created_total %d\n", memosCreated)

	fmt.Fprintln(w, "# HELP securememo_memos_read_total Total successfully read memos.")
	fmt.Fprintln(w, "# TYPE securememo_memos_read_total counter")
	fmt.Fprintf(w, "securememo_memos_read_total %d\n", memosRead)

	fmt.Fprintln(w, "# HELP securememo_http_request_duration_seconds HTTP request duration in seconds.")
	fmt.Fprintln(w, "# TYPE securememo_http_request_duration_seconds histogram")
	for _, key := range sortedDurationKeys(durations) {
		d := durations[key]
		for i, bucket := range httpDurationBuckets {
			fmt.Fprintf(w, "securememo_http_request_duration_seconds_bucket%s %d\n", key.labelsWith("le", strconv.FormatFloat(bucket, 'f', -1, 64)), d.Buckets[i])
		}
		fmt.Fprintf(w, "securememo_http_request_duration_seconds_bucket%s %d\n", key.labelsWith("le", "+Inf"), d.Count)
		fmt.Fprintf(w, "securememo_http_request_duration_seconds_sum%s %s\n", key.labels(), strconv.FormatFloat(d.Sum, 'f', -1, 64))
		fmt.Fprintf(w, "securememo_http_request_duration_seconds_count%s %d\n", key.labels(), d.Count)
	}
}

func (rw *metricsResponseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *metricsResponseWriter) Write(body []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(body)
	rw.bytes += n
	return n, err
}

func metricRoute(urlPath string) string {
	switch {
	case urlPath == "":
		return "/"
	case urlPath == "/":
		return "/"
	case urlPath == "/sitemap.xml":
		return "/sitemap.xml"
	case urlPath == "/robots.txt":
		return "/robots.txt"
	case strings.HasPrefix(urlPath, "/api/create-memo"):
		return "/api/create-memo"
	case strings.HasPrefix(urlPath, "/api/read-memo"):
		return "/api/read-memo"
	case strings.HasPrefix(urlPath, "/api/confirm-delete"):
		return "/api/confirm-delete"
	case strings.HasPrefix(urlPath, "/js/"):
		return "/js/*"
	case urlPath == "/styles.css" || strings.HasPrefix(urlPath, "/favicon") || strings.HasSuffix(urlPath, ".png"):
		return "/static/*"
	default:
		return "/page"
	}
}

func metricCountry(r *http.Request) string {
	country := strings.ToUpper(strings.TrimSpace(r.Header.Get("CF-IPCountry")))
	if country == "" {
		return "unknown"
	}
	if len(country) != 2 || !isASCIILetter(country[0]) || !isASCIILetter(country[1]) {
		return "other"
	}
	return country
}

func metricMethod(method string) string {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case http.MethodGet:
		return http.MethodGet
	case http.MethodHead:
		return http.MethodHead
	case http.MethodPost:
		return http.MethodPost
	case http.MethodOptions:
		return http.MethodOptions
	default:
		return "OTHER"
	}
}

func isASCIILetter(value byte) bool {
	return value >= 'A' && value <= 'Z'
}

func (key metricKey) labels() string {
	return fmt.Sprintf(`{method=%q,route=%q,status=%q,country=%q}`, key.Method, key.Route, key.Status, key.Country)
}

func (key metricKey) labelsWith(name, value string) string {
	return fmt.Sprintf(`{method=%q,route=%q,status=%q,country=%q,%s=%q}`, key.Method, key.Route, key.Status, key.Country, name, value)
}

func cloneUintMetrics(src map[metricKey]uint64) map[metricKey]uint64 {
	dst := make(map[metricKey]uint64, len(src))
	for key, value := range src {
		dst[key] = value
	}
	return dst
}

func cloneDurationMetrics(src map[metricKey]durationMetric) map[metricKey]durationMetric {
	dst := make(map[metricKey]durationMetric, len(src))
	for key, value := range src {
		buckets := make([]uint64, len(value.Buckets))
		copy(buckets, value.Buckets)
		value.Buckets = buckets
		dst[key] = value
	}
	return dst
}

func sortedKeys(values map[metricKey]uint64) []metricKey {
	keys := make([]metricKey, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sortMetricKeys(keys)
	return keys
}

func sortedDurationKeys(values map[metricKey]durationMetric) []metricKey {
	keys := make([]metricKey, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sortMetricKeys(keys)
	return keys
}

func sortMetricKeys(keys []metricKey) {
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].Method != keys[j].Method {
			return keys[i].Method < keys[j].Method
		}
		if keys[i].Route != keys[j].Route {
			return keys[i].Route < keys[j].Route
		}
		if keys[i].Status != keys[j].Status {
			return keys[i].Status < keys[j].Status
		}
		return keys[i].Country < keys[j].Country
	})
}
