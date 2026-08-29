#!/usr/bin/env bash

set -e

INDEX_HTML="apps/client/index.html"
HEADERS_CONF="apps/client/nginx/security-headers.conf"

node - "$INDEX_HTML" "$HEADERS_CONF" <<'NODE'
const { readFileSync } = require("node:fs");
const { createHash } = require("node:crypto");

const [indexHtml, headersConf] = process.argv.slice(2);

const html = readFileSync(indexHtml, "latin1");
const conf = readFileSync(headersConf, "latin1");

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

const expected = inlineScripts.map(
  (body) => `sha256-${createHash("sha256").update(Buffer.from(body, "latin1")).digest("base64")}`
);
const declared = [...conf.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1]);

const missing = expected.filter((h) => !declared.includes(h));
const stale = declared.filter((h) => !expected.includes(h));

if (missing.length === 0 && stale.length === 0) {
  process.exit(0);
}

console.error(`CSP script hashes in ${headersConf} do not match the inline scripts in ${indexHtml}.`);
console.error("");
if (missing.length > 0) {
  console.error("   Missing:");
  missing.forEach((h) => console.error(`     '${h}'`));
}
if (stale.length > 0) {
  console.error("   Stale (no longer matches any inline script):");
  stale.forEach((h) => console.error(`     '${h}'`));
}
console.error("");
console.error(`script-src must carry exactly these ${expected.length} hashes, in this order:`);
expected.forEach((h) => console.error(`     '${h}'`));
console.error("");
console.error("   Leaving them out of sync serves a CSP that blocks the inline scripts and breaks the page.");
process.exit(1);
NODE
