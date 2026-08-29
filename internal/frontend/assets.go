package frontend

import "embed"

// FS contains the checked-in frontend runtime assets embedded in the Go binary.
//go:embed generated/**
var FS embed.FS
