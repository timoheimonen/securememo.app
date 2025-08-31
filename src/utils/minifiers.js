/**
 * Lightweight JavaScript and CSS minification helpers.
 * Keeps index.js slimmer and focused on routing logic.
 */

/**
 * Minify small JavaScript snippets heuristically (no full parse) while being safe.
 * Removes comments and collapses intra-line whitespace without risking ASI issues
 * by preserving newlines.
 * @param {string} code Raw JS source
 * @returns {string} Minified JS (or original on failure)
 */
export function minifyJS(code) {
  try {
    return code
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/(^|\s)\/\*[\s\S]*?\*\//g, "$1")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  } catch {
    return code;
  }
}

/**
 * Minify CSS by removing comments and redundant whitespace.
 * @param {string} css Raw CSS
 * @returns {string} Minified CSS (or original on failure)
 */
export function minifyCSS(css) {
  try {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/[\t\r\n]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*([{}:;,>])\s*/g, "$1")
      .replace(/calc\(([^)]*)\)/g, (m, inner) => `calc(${inner.replace(/\s{2,}/g, " ")})`)
      .trim();
  } catch {
    return css;
  }
}
