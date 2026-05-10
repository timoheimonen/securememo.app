package frontend

import "embed"

// FS contains generated HTML, JS, CSS and public static files for the Go port.
//
// Regenerate with:
//
//	node scripts/generate-go-assets.mjs
//
//go:embed generated/**
var FS embed.FS
