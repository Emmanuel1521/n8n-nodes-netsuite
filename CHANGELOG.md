# Changelog

All notable changes to this project will be documented in this file.

## [v0.7.29] - 2026-08-18

- Added NetSuite icon (SVG) so the node renders with its own logo in the n8n canvas instead of a generic placeholder.
- Build script now copies `netSuite.svg` from `src/` into `dist/` alongside the compiled JS.

## [v0.7.28] - 2026-06-25

- Fixed `listRecords` and `runSuiteQL` returning 401 by including `limit`/`offset` in the OAuth signature (query params were previously baked into the path and excluded from signing).
- Fixed `rawRequest` OAuth signing and body handling.
- Adopted n8n v2 `continueOnFail` pattern.

## [v0.7.27] - 2026-05-25

- Initial community node implementation matching upstream functionality.
- Added `NetSuite` node supporting record operations: get, list, create, update, delete.
- SuiteQL execution and raw request support.
- Added `README.md`, CI workflow, and npm publish workflow.

()
